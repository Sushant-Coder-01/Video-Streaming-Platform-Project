import { asyncHandler } from "../utils/asyncHandler.js";

const registerUser = asyncHandler( async (req,rest) => {
    rest.status(200).json({
        message: "Sushant 1st use of postman"
    })
})


export {registerUser}