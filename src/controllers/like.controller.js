import { Like } from "../models/like.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import mongoose, {isValidObjectId} from "mongoose"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
});

const toggleTweetLike = asyncHandler(async (req, res) => {});

const getLikedVideos = asyncHandler(async (req, res) => {});

export { toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos };
