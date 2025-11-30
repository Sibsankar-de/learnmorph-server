import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { ApiResponse } from "../utils/api-response.js";
import { Topic } from "../models/topic.model.js";
import { Course } from "../models/course.model.js";


// openAI lecture model
const topicGenerateModel = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4.1-mini",
    temperature: 0.6,
});

const TOPIC_SYSTEM_PROMPT = `
You are an AI agent specialized in generating structured, descriptive notes. You will be given two inputs: a topic_title and a topic_description. Using these, you must generate a set of clear, well-organized notes.

Your response must be ONLY a valid JSON object with the following structure:

{{
    "topic": "<topic_title>",
    "notes": [
    {{
        "title": "<note_title>",
        "description": "<detailed_markdown_description>"
    }}
    ]
}}

Rules:
    - Output only JSON. No extra text, no explanation, no commentary.
    - The JSON must be valid and parsable.
    - “notes” must be an array of multiple note objects.
    - Each note must have a short, meaningful title and a detailed description written in Markdown.
    - Markdown descriptions should be well-structured, using bullet points, numbered lists, subheadings, tables, bold/italic text, or code blocks where appropriate.
    - Notes must be comprehensive, logically structured, and derived from the topic_title and topic_description.
    - Break the topic into meaningful subtopics.
    - Avoid vague or extremely short descriptions.
    - Do not include anything outside the JSON object.

Your goal is to generate high-quality, descriptive, and understandable notes for any topic provided.

Context:
    topic_title: {topic_title}
    topic_description: {topic_description}
`

const NoteSchema = z.object({
    title: z.string().trim(),
    description: z.string().trim()
});

const NotesResponseSchema = z.object({
    topic: z.string().trim(),
    notes: z
        .array(NoteSchema)
        .min(1, "At least one note is required") // adjust to .min(2) if you require multiple strictly
});

// parse the course map output
const learningNoteParser = StructuredOutputParser.fromZodSchema(NotesResponseSchema);

const learningNotePromptTemplate = ChatPromptTemplate.fromMessages([
    ["system", TOPIC_SYSTEM_PROMPT],
    ["user", "Generate detailed notes for the topic titled '{topic_title}' with description: '{topic_description}' using the specified JSON format."],
])

export const createTopicNotes = asyncHandler(async (req, res) => {
    const { slug, courseId } = req.body;
    const userId = req.user._id;

    if (!slug) {
        throw new ApiError(400, "slug is required");
    }
    const course = await Course.findById(courseId);
    const topics = course.topics;
    const topic_title = topics.find(t => t.slug === slug)?.title;
    const topic_description = topics.find(t => t.slug === slug)?.description;

    if (!topic_title || !topic_description) {
        throw new ApiError(400, "Topic title and description are required");
    }

    let topic = await Topic.findOne({ slug, courseId, userId });
    if (topic && topic.notes.length > 0) {
        return res.status(200)
            .json(new ApiResponse(200, topic, "Topic notes fetched"));
    }
    else if (!topic) {
        topic = await Topic.create({
            slug,
            userId,
            courseId,
            title: topic_title,
            description: topic_description
        });
    }

    const chain = RunnableSequence.from([
        learningNotePromptTemplate,
        topicGenerateModel.withConfig({
            response_format: { type: "json_object" } // Force JSON output
        })
    ]).pipe(learningNoteParser);

    const response = await chain.invoke({ topic_title, topic_description });

    const notesList = response.notes;

    topic.notes = notesList;

    await topic.save({ validateBeforeSave: false });

    return res.status(200).json(new ApiResponse(200, topic, "Topic notes generated successfully"));
});

const QUESTION_SYSTEM_PROMPT = `
You are a highly-effective educational assistant that specializes in creating comprehensive and accurate quiz questions. Your primary function is to generate a JSON object containing a set of multiple-choice questions based on a provided topic.

Your output must always be a JSON object. This object will contain a single key, "quiz_questions," which holds an array of question objects. Each question object must have the following keys:

- "id": A unique integer starting from 1 for the first question.
- "question": A string containing the quiz question. This question must be formatted using Markdown to support rich text, including headings, bolding, italics, code blocks, tables, and LaTeX for mathematical and scientific notation.
- "options": An array of four strings. These strings represent the multiple-choice options for the question.
- "answer_index": An integer representing the index (0-3) of the correct option within the "options" array.
- "answer_explanation": A string providing a clear and concise explanation for the correct answer.
- "completion_time": An integer representing the estimated time in minutes to complete the quiz.

## INSTRUCTIONS FOR QUESTION GENERATION:
1.  ANALYSIS OF INPUT:
    You will be provided with the following information:
    -   **QUIZ_TITLE**: The title of the quiz.
    -   **QUIZ_DESCRIPTION**: The description of the quiz.

2.  QUESTION GENERATION:
    -   Generate 7-10 questions. Do not generate more than the limit.
    -   Ensure each question has one and only one correct answer.
    -   Vary the question types (e.g., direct recall, application of concepts, problem-solving, theoretical understanding).
    -   Format each question using appropriate Markdown. For example, use Markdown code blocks for programming snippets (\`\`\`python ... \`\`\`), and use LaTeX for mathematical expressions ($E=mc^2$).
    -   Always randomize the options. All questions answer option should be randomized.
    -   Do not write any options in the question. only use options in "options" field.

3.  JSON OUTPUT REQUIREMENTS:
    -   Construct a single, well-formed JSON object.
    -   Do not include any text, explanations, or conversational filler outside of the JSON block. Your entire output must be the JSON object itself.
    -   The JSON object should strictly follow the structure defined above.


## EXAMPLE OUTPUT:
{{
  "quiz_questions": [
    {{
      "id": 1,
      "question": "What is the primary purpose of CSS Flexbox?",
      "options": [
        "To style text",
        "To create responsive layouts",
        "To add animations",
        "To manage browser history"
      ],
      "answer_index": 1,
      "answer_explanation": "CSS Flexbox is primarily used to create responsive layouts by allowing items in a container to be aligned and distributed efficiently."
    }},
    {{
      "id": 2,
      "question": "How do you center a flex item horizontally?",
      "options": [
        "Using \`justify-content: center;\`",
        "Using \`align-items: center;\`",
        "Using \`margin: auto;\`",
        "Using \`text-align: center;\`"
      ],
      "answer_index": 0,
      "answer_explanation": "\`justify-content: center;\` centers flex items horizontally within the flex container."
    }}
    // Additional questions would follow...
  ],
  "completion_time": 15,
}}

## INSTRUCTIONS
Now generate:
- A quiz question set based on the provided details
- Do not add options in the question. only use options in "options" field

**Strictly Provide the Output in a valid JSON format

## USE THE PROVIDED PARAMETERS->
QUIZ_TITLE : {quiz_title},
QUIZ_DESCRIPTION : {quiz_description}
`;

// prompt template
const quizPromptTemplate = ChatPromptTemplate.fromMessages([
    ["system", JSON.stringify(QUESTION_SYSTEM_PROMPT)],
    ["user", "Generate quiz questions along with answers and explaination."]
]);

// ZOD schemas for model output
const quizQuestionSchema = z.object({
    id: z.number().int(),
    question: z.string(),
    options: z.array(z.string()).length(4),
    answer_index: z.number().int(),
    answer_explanation: z.string(),
});

const quizOutputSchema = z.object({
    quiz_questions: z.array(quizQuestionSchema),
});

// output parser
const quizParser = StructuredOutputParser.fromZodSchema(quizOutputSchema);

export const createTopicQuiz = asyncHandler(async (req, res) => {
    const { slug, courseId } = req.body;
    const userId = req.user._id;

    if (!slug) {
        throw new ApiError(400, "Slug is required");
    }

    const course = await Course.findById(courseId);
    const topics = course.topics;
    const topic_title = topics.find(t => t.slug === slug)?.title;
    const topic_description = topics.find(t => t.slug === slug)?.description;

    let topic = await Topic.findOne({ slug, courseId, userId });
    if (topic && topic.questions.length > 0) {
        return res.status(200)
            .json(new ApiResponse(200, topic, "Topic quiz fetched"));
    }
    else if (!topic) {
        topic = await Topic.create({
            slug,
            userId,
            courseId,
            title: topic_title,
            description: topic_description
        });
    }

    const chain = RunnableSequence.from([
        quizPromptTemplate,
        topicGenerateModel.withConfig({
            response_format: { type: "json_object" } // Force JSON output
        })
    ]).pipe(quizParser);

    const output = await chain.invoke({ quiz_title: topic_title, quiz_description: topic_description });

    if (!output || output.quiz_questions.length === 0) {
        throw new ApiError(406, "Failed to generate quiz");
    }

    // parse the output
    const generatedContent = output.quiz_questions;

    // separate the questions and solutions
    let questions = [];
    let solutions = [];

    // store the questions and solutions from the output
    generatedContent.forEach((item) => {
        questions.push({
            id: item.id,
            question: item.question,
            options: item.options.map((opt, index) => ({ id: index + 1, value: opt }))
        });

        solutions.push({
            questionId: item.id,
            question: item.question,
            answer: {
                optionId: item.answer_index + 1,
                optionIndex: item.answer_index,
                value: item.options[item.answer_index],
                explaination: item.answer_explanation
            }
        })
    });

    topic.questions = questions;
    topic.solutions = solutions;
    await topic.save({ validateBeforeSave: false });

    return res.status(200).json(new ApiResponse(200, topic, "Topic quiz generated successfully"));
});

export const checkAnswer = asyncHandler(async (req, res) => {
    const { slug, courseId, questionId, answer } = req.body;
    const userId = req.user._id;

    const topic = await Topic.findOne({ slug, courseId, userId });

    if (!topic) throw new ApiError(400, "Topic not found");

    const solutions = topic.solutions;
    const correctAnswer = solutions.find(e => e.questionId === questionId).answer;
    let isCorrect = false;
    if (correctAnswer.optionId === answer.id) {
        isCorrect = true;
    }

    topic.attempts.push({
        questionId,
        answerId: answer.id,
        isCorrect
    })

    if (topic.progress < 100) {
        const progress = (topic.attempts / topic.questions) * 100;
        await topic.findByIdAndUpdate(topic._id, { progress }, { new: true });
    }
    topic.save({ validateBeforeSave: false });

    const resObject = {
        isCorrect,
        answer: correctAnswer
    }

    return res.status(200)
        .json(new ApiResponse(200, resObject, "Answer checked"));

});

function mergeTopics(allTopics, createdTopics) {
  // Step 1: Map createdTopics for lookup
  const createdMap = new Map(createdTopics.map(t => [t.slug, t]));

  // Step 2: Merge lists by slug
  const merged = allTopics.map(topic => {
    const override = createdMap.get(topic.slug);
    return {
      ...topic,
      ...(override || {}),
      isActive: !!override  // active if it's part of createdTopics
    };
  });

  // Step 3: If there are created topics, activate the next one too
  if (createdTopics.length > 0) {
    const lastCreatedSlug = createdTopics[createdTopics.length - 1].slug;
    const lastIndex = merged.findIndex(t => t.slug === lastCreatedSlug);

    const nextIndex = lastIndex + 1;

    if (merged[nextIndex]) {
      merged[nextIndex].isActive = true; // activate next topic
    }
  } else {
    // No created topics → activate first topic
    if (merged.length > 0) merged[0].isActive = true;
  }

  return merged;
}


export const getTopics = asyncHandler(async (req, res) => {
    const courseId = req.params.id;
    const userId = req.user._id;

    const createdTopics = await Topic.find({ courseId, userId });
    const allTopics = await Course.findById(courseId).select("topics");

    const topicList = mergeTopics(allTopics.topics, createdTopics);

    return res.status(200)
        .json(new ApiResponse(200, topicList, "Topics fetched"));

});