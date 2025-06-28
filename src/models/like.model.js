import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
    {
        video: {
            type: Schema.Types.ObjectId,
            ref: "Video",
            required: [true, "Video reference is required"],
        },
        comment: {
            type: Schema.Types.ObjectId,
            ref: "Comment",
            required: [true, "Comment reference is required"],
        },
        tweet: {
            type: Schema.Types.ObjectId,
            ref: "Tweet",
            required: [true, "Tweet reference is required"],
        },
        likedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User reference is required"],
        },
    },
    {
        timestamps: true,
    }
);

export const Like = mongoose.model("Like", likeSchema);
