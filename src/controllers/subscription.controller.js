import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

//toggle Subscription

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!channelId) {
    throw new ApiError(400, "Channel not found");
  }

  const channel = await User.findById({
    _id: channelId,
  });

  let subscribe, unsubscribe;

  const itHasSubscription = await Subscription.findOne({
    subscriber: req.user._id,
    channel: channelId,
  });
  if (itHasSubscription) {
    //unscribe
    unsubscribe = await Subscription.findOneAndDelete({
      subscriber: req.user._id,
      channel: channelId,
    });
    if (!unsubscribe) {
      throw new ApiError(
        500,
        "Something went wrong while unscribing the channel"
      );
    }
    return res
      .status(200)
      .json(
        new ApiResponse(200, unsubscribe, "Chanel Unsubscribe Successfuly!!")
      );
  } else {
    subscribe = await Subscription.create({
      subscriber: req.user._id,
      channel: channelId,
    });
    if (!subscribe) {
      throw new ApiError(
        500,
        "Something went Wrong While Subscribe the Channel"
      );
    }
    return res
      .status(200)
      .json(new ApiResponse(200, subscribe, "Channel Subscribed Successfully"));
  }
});

// controller to return subscriber list of channel

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!channelId) {
    throw new ApiError(400, "Channel Id is not find");
  }

  const subscriptions = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(channelId.trim()),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscribers",
      },
    },
    {
      $project: {
        subscribers: {
          username: 1,
          fullName: 1,
          avatar: 1,
        },
      },
    },
  ]);
  console.log(subscriptions, "===>subscriptions");
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscriptions[0],
        "All user channel Subscribes fetched successfully"
      )
    );
});

//controller to return channel list to which user has subscribed

const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!subscriberId) {
    throw new ApiError(400, "Subscriber Id is not Found");
  }

  const subscriptions = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(subscriberId.trim()),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "subscribedChannel",
      },
    },
    {
      $project: {
        subscribedChannel: {
          username: 1,
          avatar: 1,
        },
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscriptions[0],
        "All Subscribed Channel Successfully"
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
