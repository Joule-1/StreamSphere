import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
    {
        subscriber: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Subscriber reference is required"],
        },
        channel: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Channel reference is required"],
        },
    },
    {
        timestamps: true,
    }
);

subscriptionSchema.index({ subscriber: 1, channel: 1 }, { unique: true });

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
