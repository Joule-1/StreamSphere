import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return {
            accessToken,
            refreshToken,
        };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generation refresh and access token"
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    const { fullname, email, username, password } = req.body;

    if (
        [fullname, email, username, password].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (existedUser)
        throw new ApiError(409, "User with email or username already exists");

    const avatarLocalPath = req.files?.avatar[0]?.path;

    let coverImageLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    )
        coverImageLocalPath = req.files.coverImage[0].path;

    if (!avatarLocalPath) throw new ApiError(400, "Avatar file is required");

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) throw new ApiError(500, "Error in uploading file");

    if (!avatar?.secure_url)
        throw new ApiError(500, "Failed to get avatar URL");

    const user = await User.create({
        username,
        email,
        fullname,
        avatar: avatar?.secure_url,
        coverImage: coverImage?.secure_url || "",
        password,
    });

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser)
        throw new ApiError(
            500,
            "Something went wrong while registering the user"
        );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(201)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(201, createdUser, "User Registered Successfully")
        );
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;

    if (!username && !email)
        throw new ApiError(400, "Username or Email is required");

    const user = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (!user) throw new ApiError(400, "User doesn't exist");

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) throw new ApiError(401, "Invalid User Credentials");

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!loggedInUser)
        throw new ApiError(
            500,
            "Something went wrong while logging in the user"
        );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, loggedInUser, "User logged in successfully")
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1,
            },
        },
        {
            new: true,
        }
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User Logged Out"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(200, req.user, "Current User Fetched Successfully")
        );
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken;

    if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized Request");

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken?._id);

        if (!user) throw new ApiError(401, "Invalid Refresh Token");

        if (incomingRefreshToken !== user?.refreshToken)
            throw new ApiError(401, "Refresh Token is expired or used");

        const options = {
            httpOnly: true,
            secure: true,
        };

        const { accessToken, newRefreshToken } =
            await generateAccessAndRefreshTokens(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        refreshToken: newRefreshToken,
                    },
                    "Access Token Refreshed"
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token");
    }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = User.findById(req.user?._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) throw new ApiError(400, "Invalid Old Password");

    user.password = newPassword;

    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password Changed Successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullname, email } = req.body;

    if (!fullname || !email) throw new ApiError(400, "All fields are required");

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email,
            },
        },
        {
            new: true,
        }
    ).select("-password");

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Account Details Updated Successfully")
        );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) throw new ApiError(400, "Avatar file is missing");

    const existingUser = await User.findById(req.user?._id);

    if (!existingUser) throw new ApiError(400, "User not found");

    if (existingUser.avatar) {
        try {
            const parts = existingUser.avatar.split("/");
            const filename = parts[parts.length - 1];
            const publicId = filename.split(".")[0];

            await cloudinary.uploader.destroy(publicId, {
                resource_type: "auto",
            });
        } catch (error) {
            console.log(
                "Error while deleting old avatar from cloudinary ",
                error
            );

            throw new ApiError(
                400,
                "Error while deleting old avatar from cloudinary"
            );
        }
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar.secure_url)
        throw new ApiError(400, "Error while uploading avatar");

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.secure_url,
            },
        },
        {
            new: true,
        }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar image updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath)
        throw new ApiError(400, "Cover image file is missing");

    const existingUser = await User.findById(req.user?._id);

    if (!existingUser) throw new ApiError(400, "User not found");

    if (existingUser.avatar) {
        try {
            const parts = existingUser.avatar.split("/");
            const filename = parts[parts.length - 1];
            const publicId = filename.split(".")[0];

            await cloudinary.uploader.destroy(publicId, {
                resource_type: "auto",
            });
        } catch (error) {
            console.log(
                "Error while deleting old cover image from cloudinary ",
                error
            );

            throw new ApiError(
                400,
                "Error while deleting old cover image from cloudinary"
            );
        }
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage.secure_url)
        throw new ApiError(400, "Error while uploading cover image");

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.secure_url,
            },
        },
        {
            new: true,
        }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Cover image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {});

const getWatchHistory = asyncHandler(async (req, res) => {});

return {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    refreshAccessToken,
    changeCurrentPassword,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
};
