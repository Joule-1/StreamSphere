import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import {v2 as cloudinary} from "cloudinary";

const getAllVideos = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        query,
        sortBy = "createdAt",
        sortType = "desc",
        userId,
    } = req.query;

    const matchStage = { isPublished: true };
    if (query) {
        matchStage.title = { $regex: query, $options: "i" };
    }
    if (userId && isValidObjectId(userId)) {
        matchStage.owner = new mongoose.Types.ObjectId(userId);
    }

    const sortOptions = {
        [sortBy]: sortType === "asc" ? 1 : -1,
    };

    const aggregate = Video.aggregate([
        { $match: matchStage },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
            },
        },
        { $unwind: "$owner" },
        {
            $project: {
                title: 1,
                description: 1,
                thumbnail: 1,
                views: 1,
                isPublished: 1,
                createdAt: 1,
                owner: {
                    _id: "$owner._id",
                    username: "$owner.username",
                    avatar: "$owner.avatar",
                },
            },
        },
        { $sort: sortOptions },
    ]);

    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
    };

    const result = await Video.aggregatePaginate(aggregate, options);

    res.status(200).json(
        new ApiResponse(200, result, "Videos fetched successfully")
    );
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    if (!title || !description) {
        throw new ApiError(400, "Title and description are required");
    }

    const videoLocalPath = req.files?.videoFile?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    if (!videoLocalPath || !thumbnailLocalPath) {
        throw new ApiError(400, "Both video and thumbnail files are required");
    }

    const videoFile = await uploadOnCloudinary(videoLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!videoFile?.secure_url || !thumbnail?.secure_url) {
        throw new ApiError(500, "Cloudinary upload failed");
    }

    const video = await Video.create({
        videoFile: videoFile.secure_url,
        thumbnail: thumbnail.secure_url,
        title,
        description,
        owner: req.user._id,
        isPublished: true,
    });

    res.status(201).json(
        new ApiResponse(201, video, "Video published successfully")
    );
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId).populate(
        "owner",
        "username avatar"
    );

    if (!video) throw new ApiError(404, "Video not found");

    if (!video.isPublished && !video.owner._id.equals(req.user._id)) {
        throw new ApiError(403, "You are not authorized to view this video");
    }

    video.views += 1;
    await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });

    res.status(200).json(
        new ApiResponse(200, video, "Video fetched successfully")
    );
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);

    if (!video) throw new ApiError(404, "Video not found");

    if (!video.owner.equals(req.user._id)) {
        throw new ApiError(403, "Unauthorized to update this video");
    }

    if (title) video.title = title;
    if (description) video.description = description;

    const thumbnailLocalPath = req.file?.path;

    if (thumbnailLocalPath) {
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

        if (!thumbnail?.secure_url) {
            throw new ApiError(500, "Cloudinary upload failed");
        }
        
        video.thumbnail = thumbnail.secure_url;
    }

    await video.save();

    res.status(200).json(
        new ApiResponse(200, video, "Video updated successfully")
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);

    if (!video) throw new ApiError(404, "Video not found");

    if (!video.owner.equals(req.user._id)) {
        throw new ApiError(403, "Unauthorized to delete this video");
    }

    if(video.videoFile && video.thumbnail){
        try {
            const videoParts = video.videoFile.split("/")
            const videoName = videoParts[videoParts.length - 1]
            const videoPublicId = videoName.split(".")[0]

            await cloudinary.uploader.destroy(videoPublicId, {
                resource_type: "video"
            })

            const thumbnailParts = video.thumbnail.split("/");
            const thumbnailName = thumbnailParts[thumbnailParts.length - 1]
            const thumbnailPublicId = thumbnailName.split(".")[0]

            await cloudinary.uploader.destroy(thumbnailPublicId, {
                resource_type: "image"
            })
        } catch (error) {
            console.log("Error while deleting video and thumbnail from cloudinary")
            throw new ApiError(404, "Error while deleting video and thumbnail from cloudinary")
        }
    }

    await video.deleteOne();

    res.status(200).json(
        new ApiResponse(200, null, "Video deleted successfully")
    );
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);

    if (!video) throw new ApiError(404, "Video not found");

    if (!video.owner.equals(req.user._id)) {
        throw new ApiError(403, "Unauthorized to update this video");
    }

    video.isPublished = !video.isPublished;
    await video.save();

    res.status(200).json(
        new ApiResponse(
            200,
            video,
            `Video ${video.isPublished ? "published" : "unpublished"} successfully`
        )
    );
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
};
