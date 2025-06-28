import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new Schema(
    {
        video: {
            type: Schema.Types.ObjectId,
            ref: "Video",
            required: [true, "Video reference is required"],
        },
        text: {
            type: String,
            required: [true, "Comment's text is required"],
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Comment's owner is required"],
        },
    },
    {
        timestamps: true,
    }
);

commentSchema.plugin(mongooseAggregatePaginate);

export const Comment = mongoose.model("Comment", commentSchema);
