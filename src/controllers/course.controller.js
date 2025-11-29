import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { Course } from "../models/course.model.js";
import { ApiResponse } from "../utils/api-response.js";
import { generateSlug } from "../utils/generateSlug.js";


// openAI lecture model
const courseGenerateModel = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4.1-mini",
    temperature: 0.6,
});

const COURSE_SYSTEM_PROMPT = `
You are an AI Learning Path Generator.
Your task is to generate a complete, structured learning path for any subject the user requests.
You must return only valid and properly formatted JSON, with no extra text, explanations, or commentary.

JSON OUTPUT RULES
    - You must output a single JSON object with the following structure:
    {{
        "title": "string - main course title",
        "description": "string - short summary of the course",
        "level": "string - beginner | intermediate | advanced",
        "tags": ["array", "of", "related", "keywords"],
        "topics": [
            {{
            "title": "string - topic title",
            "description": "string - what this topic teaches",
            "tags": ["array", "of", "keywords"]
            }}
        ]
    }}
    
CONTENT RULES
    - Every course must contain 7 to 10 topics.
    - Each topic must include:
        - title
        - description
        - tags (minimum 3 tags)
    - The entire JSON must follow proper formatting and must be parseable.

STYLE RULES
    - Titles should be clear and concise.
    - Descriptions should be informative but not overly long.
    - Tags should be relevant to the course and topic.
    - Keep the writing neutral, educational, and accurate.
`

const TopicSchema = z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()).min(3)
});

const LearningPathSchema = z.object({
    title: z.string(),
    description: z.string(),
    level: z.string(),
    tags: z.array(z.string()).min(1),
    topics: z.array(TopicSchema)
});

// parse the course map output
const courseMapParser = StructuredOutputParser.fromZodSchema(LearningPathSchema);

const coursePromptTemplate = ChatPromptTemplate.fromMessages([
    ["system", COURSE_SYSTEM_PROMPT],
    ["user", "Generate a learning path based on the following requirements: {prompt}"],
])

export const createCourse = asyncHandler(async (req, res) => {
    const { userPrompt } = req.body;
    const userId = req.user._id;

    if (!userPrompt) throw new ApiError(400, "User prompt is request");

    const chain = RunnableSequence.from([
        coursePromptTemplate,
        courseGenerateModel.withConfig({
            response_format: { type: "json_object" } // Force JSON output
        })
    ]).pipe(courseMapParser);

    // get output from the chain
    const output = await chain.invoke({
        prompt: userPrompt,
    });

    if (!output) {
        throw new ApiError(500, "Failed to create learning path");
    }

    let course = output;
    const slug = generateSlug(course.title);

    const newCourse = await Course.create({
        userId,
        title: course.title,
        description: course.description,
        tags: course.tags,
        slug: slug,
        level: course.level,
        topics: course.topics,
        topicsCount: course.topics.length
    });

    if (!newCourse) throw new ApiError(500, "Failed to create learning path");

    return res.status(200)
        .json(new ApiResponse(200, newCourse, "New course created"));

});