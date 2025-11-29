import { asyncHandler } from "../utils/async-handler";
import { ApiError } from "../utils/api-error.js";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { Course } from "../models/course.model.js";
import { ApiResponse } from "../utils/api-response.js";
import { generateSlug } from "../utils/generateSlug.js";


export const createTopic = asyncHandler(async(req, res)=>{

})