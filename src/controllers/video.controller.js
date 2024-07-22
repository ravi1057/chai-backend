import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

//Publish Video

const publishVideo = asyncHandler(async (req, res) => {
  const { title, description, isPublished = true } = req.body;
  if (!title || title.trim() === "") {
    throw new ApiError(400, "Title content is required");
  }
  if (!description || description.trim() === "") {
    throw new ApiError(400, "Description is required");
  }

  //localpath
  const videoFileLocalPath = req.files?.videoFile?.[0].path;
  const thumbnailFileLocalPath = req.files?.thumbnail?.[0].path;

  if (!videoFileLocalPath) {
    throw new ApiError(400, "video file is missing!!");
  }

  //upload on cloudnary;
  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailFileLocalPath);
  if (!videoFile) {
    throw new ApiError(
      500,
      "Something Went Wrong While Uploading video file on Cloundary"
    );
  }

  //store in database
  const video = await Video.create({
    videoFile: {
      public_id: videoFile?.public_id,
      url: videoFile?.url,
    },
    thumbnail: {
      public_id: videoFile?.public_id,
      url: videoFile?.url,
    },
    title,
    description,
    isPublished,
    owner: req.user._id,
    duration: videoFile?.duration,
  });
  if (!video) {
    throw new ApiError(
      500,
      "Something wnet wrong while store the video in database"
    );
  }
  return res
    .status(200)
    .json(new ApiResponse(201, video, "Video uploaded Successfully!!"));
});

//get Video By Id
const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(404, "Video not Found");
  }
  const video = await Video.findById({
    _id: videoId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video Feteched Successfully"));
});

//update Video Details

const updateVideoDetails = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;
  if (!title || !description) {
    throw new ApiError(400, "All Fields are Required");
  }

  const updateVideoDetails = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
      },
    },
    {
      new: true,
    }
  );
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { updateVideoDetails },
        "Video Detaials Updated Successfully"
      )
    );
});

//get All Videos

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query = `/^video/`,
    sortBy = "createdAt",
    sortType = 1,
    userId = req.user?.id,
  } = req.query;

  // Find user in db
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(400, "user not found");
  }

  const aggregationPipeline = [
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
        $or: [
          { title: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
        ],
      },
    },
    {
      $sort: {
        [sortBy]: sortType,
      },
    },
    {
      $skip: (page - 1) * limit,
    },
    {
      $limit: parseInt(limit, 10),
    },
  ];

  // Use aggregatePaginate with the aggregation pipeline
  Video.aggregatePaginate(Video.aggregate(aggregationPipeline), { page, limit })
    .then((result) => {
      return res
        .status(200)
        .json(new ApiResponse(200, result, "fetched all videos successfully"));
    })
    .catch((error) => {
      console.error("Error while fetching all videos:", error);
      throw error;
    });
});

//Delete Video

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "Video not found");
  }

  //Find the Video in db

  const video = await Video.findById({
    _id: videoId,
  });
  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You don't have permission to delete this video!");
  }

  //Delete video and thumbnail in Cloudinary

  if (video.videoFile) {
    await deleteOnCloudinary(video.videoFile.public_id, "video");
  }

  if (video.thumbnail) {
    await deleteOnCloudinary(video.thumbnail.public_id, "video");
  }

  const deleteResponse = await Video.findByIdAndDelete(video);
  if (!deleteResponse) {
    throw new ApiError(500, "Something went wrong while deleting the video");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, deleteResponse, "Video Deleted Successfully"));
});

//toggle Publish status

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "Video not found");
  }

  //find video in db

  const video = await Video.findById({
    _id: videoId,
  });

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "You don't have permission to toggle publish status"
    );
  }

  //toggle status
  video.isPublished = !video.isPublished;

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video toggled Successfully"));
});

export {
  publishVideo,
  getVideoById,
  updateVideoDetails,
  getAllVideos,
  deleteVideo,
  togglePublishStatus,
};
