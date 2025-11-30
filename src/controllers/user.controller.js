import { User } from "../models/user.model.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { deleteFromClodinary, uploadOnClodinary } from "../utils/cloudinary-connects.js";


// regiater user with email
export const registerUser = asyncHandler(async (req, res) => {
    const { userName, email, password } = req.body;

    if ([userName, email, password].some(e => e === '')) {
        throw new ApiError(400, 'Fields are required')
    }

    const existedUser = await User.findOne({ email })

    if (existedUser) throw new ApiError(402, 'User already exist');

    await User.create({
        userName: userName,
        email,
        password,
    })

    return (
        res.status(200)
            .json(new ApiResponse(200, {}, "User created sucessfully"))
    )
})

// generates tokens
// set tokens to cookies
// logout user
export const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();
        if (!accessToken || !refreshToken) throw new ApiError(401, "Unable to generate tokens");
        user.refreshToken = refreshToken;
        user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        console.log(error);

        throw new ApiError(501, "Server error on generating tokens");
    }
}

export const loginUser = asyncHandler(async (req, res) => {
    const { email,password } = req.body;
    if (!email || !password) throw new ApiError(400, "Fields are required");

    const user = await User.findOne({ email });
    if (!user) throw new ApiError(402, "User not found");
    const isPasswordCorrect = await user.checkPassword(password);
    if (!isPasswordCorrect) throw new ApiError(403, "Incorrect password");

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user?._id);

    const expiresInDays = parseInt(process.env.LOG_COOKIE_EXPIRY, 10);
    const expiresDate = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    const cookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        origin: process.env.CORS_ORIGIN,
        path: '/',
        expires: expiresDate
    }
    return (
        res.status(200)
            .cookie('accessToken', accessToken, cookieOptions)
            .cookie('refreshToken', refreshToken, cookieOptions)
            .json(new ApiResponse(200, {}, "User loggedin successfully"))
    )
});

export const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, {
        $set: {
            refreshToken: undefined
        }
    }, { new: true });

    const expiresInDays = parseInt(process.env.LOG_COOKIE_EXPIRY, 10);
    const expiresDate = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    const cookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        origin: process.env.CORS_ORIGIN,
        path: '/',
        expires: expiresDate
    }

    return res.status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, {}, "User logged out"))
})

export const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(400, "Unauthorized Request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, 'Invalid refresh token')
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, 'Refresh token is expired')
        }

        const expiresInDays = parseInt(process.env.LOG_COOKIE_EXPIRY, 10);
        const expiresDate = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

        const cookieOptions = {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            origin: process.env.CORS_ORIGIN,
            path: '/',
            expires: expiresDate
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id)

        return res.status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .cookie('refreshToken', newRefreshToken, cookieOptions)
            .json(
                new ApiResponse(
                    200, {}, "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }


})

export const checkAuth = asyncHandler(async (req, res) => {
    let isAuthenticated;
    if (req.user) isAuthenticated = true;
    else isAuthenticated = false;

    return res.status(200)
        .json(new ApiResponse(200, { isAuthenticated }, "Authentication fetched"))
})

// update user credentials, avatar and user formal details
export const updatePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body
    if (!newPassword) throw new ApiError(400, "All fields are required")
    const user = await User.findById(req.user?._id)

    // verifies current password
    const verifyCurrentPassword = await user.checkPassword(currentPassword)
    if (!verifyCurrentPassword) throw new ApiError(402, "Correct password is required")

    // updates new password
    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res.status(200)
        .json(new ApiResponse(200, {}, "Password updated"))
})

export const updateUser = asyncHandler(async (req, res) => {
    const { userName, email } = req.body;
    if ([userName, email].some(e => e === "")) throw new ApiError("All fields are required");
    const currentUser = await User.findById(req.user?._id);
    const existedUser = await User.findOne({ email });
    if (existedUser && existedUser?.email !== currentUser.email) throw new ApiError(402, "Email already in use");

    await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                userName,
                email
            }
        },
        {
            new: true
        }
    )

    return res.status(200)
        .json(new ApiResponse(200, {}, "Username updated"))
})

export const updateAvatar = asyncHandler(async (req, res) => {
    const avatarFile = req.file?.path

    if (!avatarFile) throw new ApiError(400, "Avatar is required")

    const user = await User.findById(req.user?._id)

    const newAvatar = await uploadOnClodinary(avatarFile);

    // removes old avatar from firebase cloud
    if (user?.avatar) {
        await deleteFromClodinary(user?.avatar)
    }

    // updates new Avatar
    user.avatar = newAvatar?.url
    await user.save({ validateBeforeSave: false })

    res.status(200)
        .json(new ApiResponse(200, {}, "Avatar updated successfully"))
})

export const getCurrentUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user?._id).select("-password -refreshToken");

    return res.status(200)
        .json(new ApiResponse(200, user, "User fetched"))
})