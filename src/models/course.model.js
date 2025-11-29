import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
    slug:{
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Types.ObjectId,
        required: true,
        ref: "User"
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    progress: {
        type: Number,
        default: 0
    },
    level: {
        type: String
    },
    tags: {
        type: [String],
        default: []
    },
    topicsCount: {
        type: Number,
        default: 0
    },
    topics: {
        type: Object
    },
    completedTopicsCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true })

export const Course = mongoose.model("Course", courseSchema);