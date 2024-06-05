import { v2 as cloudinary} from "cloudinary" 
import { ApiError } from "./ApiError"

const deleteOldFiles = async (fileOldUrl) =>{

    try {
        if(!fileOldUrl) return false ;

        await cloudinary.uploader.destroy(fileOldUrl, {
            resource_type: "auto"
        })
        return true;
    } catch (error) {
        throw new ApiError(500,"Error while deleting old file");
    }
}

export { deleteOldFiles }