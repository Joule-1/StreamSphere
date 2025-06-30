import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const [videoCount, totalViewsResult, subscriberCount, likeCountResult] =
        await Promise.all([
            Video.countDocuments({ owner: userId }),

            Video.aggregate([
                { $match: { owner: userId } },
                {
                    $group: {
                        _id: null,
                        totalViews: { $sum: "$views" },
                    },
                },
            ]),

            Subscription.countDocuments({ channel: userId }),

            Like.aggregate([
                {
                    $match: {
                        video: { $exists: true },
                    },
                },
                {
                    $lookup: {
                        from: "videos",
                        localField: "video",
                        foreignField: "_id",
                        as: "videoData",
                    },
                },
                { $unwind: "$videoData" },
                {
                    $match: {
                        "videoData.owner": new mongoose.Types.ObjectId(userId),
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalLikes: { $sum: 1 },
                    },
                },
            ]),
        ]);

    const totalViews = totalViewsResult[0]?.totalViews || 0;
    const totalLikes = likeCountResult[0]?.totalLikes || 0;

    const stats = {
        totalVideos: videoCount,
        totalViews,
        totalSubscribers: subscriberCount,
        totalLikes,
    };

    res.status(200).json(new ApiResponse(200, stats, "Stats retrieved successfully"));
});

const getChannelVideos = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const aggregate = Video.aggregate([
        { $match: { owner: userId } },
        {
            $project: {
                _id: 1,
                title: 1,
                thumbnail: 1,
                views: 1,
                isPublished: 1,
                createdAt: 1,
            },
        },
        { $sort: { createdAt: -1 } },
    ]);

    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
    };

    const result = await Video.aggregatePaginate(aggregate, options);

    res.status(200).json(
        new ApiResponse(200, result, "Channel videos fetched successfully")
    );
});

export { getChannelStats, getChannelVideos };
