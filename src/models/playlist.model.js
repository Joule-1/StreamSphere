import mongoose, { Schema } from "mongoose";

const playlistSchema = new Schema(
    {
        name: {
            type: String,
            required: [true, "Playlist name is required"],
        },
        description: {
            type: String,
            required: [true, "Playlist description is required"],
        },
        videos: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video",
            },
        ],
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Playlist owner is required"],
        },
    },
    {
        timestamps: true,
    }
);

export const playlist = mongoose.model("Playlist", playlistSchema);
