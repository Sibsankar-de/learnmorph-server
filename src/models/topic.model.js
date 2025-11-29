import mongoose from "mongoose";
import { Schema } from "mongoose";

const noteSchema = new mongoose.Schema({
    title: {
        type: String
    },
    description: {
        type: String
    }
}, { _id: false });

// quiz question schema
const questionSchema = new Schema({
    id: {
        type: Number,
        required: true
    },
    question: {
        type: String,
        required: true
    },
    options: [{
        id: {
            type: Number
        },
        value: {
            type: String
        }
    }]
}, { _id: false });

// quiz solution schema
const solutionSchema = new Schema({
    questionId: {
        type: Number,
        required: true
    },
    question: {
        type: String,
        required: true
    },
    answer: {
        optionId: {
            type: Number,
            required: true
        },
        optionIndex: {
            type: Number,
            required: true
        },
        value: {
            type: String
        },
        explaination: {
            type: String
        }
    }
}, { _id: false });

// quiz attempt schema
const attemptSchema = new Schema({
    questionId: {
        type: Number
    },
    answerId: {
        type: Number
    },
    isCorrect: {
        type: Boolean
    }
}, { _id: false });

const topicSchema = new mongoose.Schema({
    slug: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Types.ObjectId,
        required: true,
        ref: "User"
    },
    courseId: {
        type: mongoose.Types.ObjectId,
        ref: "Course"
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    notes: {
        type: [noteSchema],
        default: []
    },
    questions: {
        type: [questionSchema],
        default: []
    },
    solutions: {
        type: [solutionSchema],
        default: []
    },
    attempts: {
        type: [attemptSchema],
        default: []
    },
    progress: {
        type: Number,
        default: 0
    },
    isCompleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

export const Topic = mongoose.model("Topic", topicSchema);