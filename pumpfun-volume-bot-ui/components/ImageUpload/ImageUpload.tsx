import React, { ChangeEvent, useState } from "react";
import { DownloadIcon } from "../icons";
import { useDispatch, useSelector } from "react-redux";
import { Spinner } from "@heroui/spinner";
import { AppDispatch, RootState } from "@/redux/store";
import { uploadImage } from "@/utils/ImageUpload";
import { updateImage } from "@/redux/slices/tokenSlice";

export default function ImageUpload() {
  const dispatch: AppDispatch = useDispatch();

  const initImage = useSelector((state: RootState) => state.token.data.image);
  const [url, setUrl] = useState(initImage);
  const [uploading, setUploading] = useState(false);

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    setUploading(true);
    const file = e.target.files && e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUrl(url);
      const imageUrl = await uploadImage(url);
      if (imageUrl) {
        dispatch(updateImage(imageUrl));
      }
    }
    setUploading(false);
  };


  return (
    <label
      htmlFor="hidden-input"
      className="container mx-auto max-w-screen-lg h-full relative"
    >
      <div
        className="h-full w-full flex flex-col gap-3 items-center justify-center border-dashed rounded-md text-sm bg-[#2e2d2d] bg-opacity-50 py-1 px-3 border-2 mb-2 border-[#334155] bg-cover bg-center bg-no-repeat cursor-pointer"
        style={{ backgroundImage: `${url && `url(${url})`}` }}
      >
        {!url && (
          <>
            <div className="rounded-full p-2 bg-black bg-opacity-20">
              {uploading ? <Spinner color="success" /> : <DownloadIcon />}
            </div>
            <p className="font-segoe text-[#FFFFFFB3]">
              Click to upload token image
            </p>
          </>
        )}

        <input
          id="hidden-input"
          type="file"
          className="hidden"
          disabled={uploading}
          onChange={handleImageChange}
        />
      </div>
    </label>
  );
}
