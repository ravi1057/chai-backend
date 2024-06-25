import  {asyncHandler}  from "../utils/asyncHandler.js";

const registerUser = asyncHandler(async (req, res, next) => {
  res.status(500).json({
    message: "User created",
  });
});


export  {registerUser}