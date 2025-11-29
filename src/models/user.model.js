import mongoose from "mongoose";
import { Schema } from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const userSchema = new Schema({
    userName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    avatar: {
        type: String
    },
    refreshToken: {
        type: String
    }
}, {
    timestamps: true
});

// hash password
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return; 

    this.password = await bcrypt.hash(this.password, 10);
});

// verify user password
userSchema.methods.checkPassword = async function (password) {
    return await bcrypt.compare(password, this.password);
}

// generates tokens with id
userSchema.methods.generateAccessToken = async function () {
    return (
        jwt.sign({
            _id: this._id
        }, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        })
    )
}

userSchema.methods.generateRefreshToken = function () {
    return (
        jwt.sign({
            _id: this._id
        }, process.env.REFRESH_TOKEN_SECRET, {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        })
    )
}

export const User = mongoose.model('User', userSchema);