import { Request, Response } from "express";

//Utils
import AskQuestion from "../utils/texts/askQuestion";
import checkCountryExistFun from "../utils/functions/checkCountryExist";
import countryDataFun from "../utils/functions/countryData";
import generateItineraryFun from "../utils/functions/generateItinerary";
import generatePhotosFun from "../utils/functions/generatePhotos";

//Interfaces
import { ICountryCode } from "../interfaces/forFunctions/countryCode";
import { IItinerary } from "../interfaces/data/itinerary";
import { IPhoto } from "../interfaces/data/photo";
import { ICountryDataFun } from "../interfaces/forFunctions/countryDataFun";

//Dotenv
import dotenv from "dotenv";
dotenv.config();

export default async function trip(req: Request, res: Response) {
  try {
    const country: string = String(req.query.country);
    const days: number = Number(req.query.days);
    const month: string = String(req.query.month || ``);
    const part: string = String(req.query.part || ``);
    const nature: number = Number(req.query.nature || 0);
    const history: number = Number(req.query.history || 0);
    const cities: number = Number(req.query.cities || 0);

    //Checking whether the requested country exists in the database
    const checkCountryExist: ICountryCode | null =
      checkCountryExistFun(country);

    if (!checkCountryExist) {
      throw new Error("Can't find country in database.");
    }

    //Checking whether the number of days is below the minimum or above the maximum
    if (!days || days < 2 || days > 31)
      throw new Error("Allowed days number is between 2 and 31");

    //Obtaining general information about the country
    const countryData: ICountryDataFun = await countryDataFun(
      checkCountryExist
    );

    if (!countryData.data && countryData.error) {
      throw new Error(countryData.error);
    }

    //Generating itineraries from AI
    const question: string = AskQuestion(
      country,
      days,
      month,
      part,
      nature,
      history,
      cities
    );

    const itinerary: IItinerary = await generateItineraryFun(question);

    //Itinerary generation from Pexels
    const photo: IPhoto[] | null = await generatePhotosFun(country);

    //Response
    res.json({
      status: `success`,
      data: {
        info: countryData.data,
        itinerary,
        photo,
      },
    });
  } catch (error: any) {
    let errorObj = {};

    //Error handling if we are in production mode
    if (process.env.NODE_ENV === `production`) {
      if (
        error.message === "Allowed days number is between 2 and 31" ||
        error.message === "Can't find country in database."
      )
        errorObj = { message: error.message };
      else
        errorObj = {
          message: "Can't create itinerary. Please try again later.",
        };
    }
    //Error handling if we are in development mode
    else {
      errorObj = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    }
    //Error response
    res.status(404).json({
      status: `fail`,
      error: errorObj,
    });
  }
}
