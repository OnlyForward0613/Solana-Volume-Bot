export const UploadImage = async (file: File) => {
  if (!file) return; // Ensure there's an image to upload

  const data = new FormData();
  data.append("file", file);
  data.append(
    "upload_preset",
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!
  );
  data.append("cloud_name", process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!);
  data.append("folder", "resume");

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
      {
        method: "POST",
        body: data,
      }
    );

    if (!response.ok) {
      throw new Error("Failed to upload pdf");
    }
    const res = await response.json();
    return res.url;
  } catch (error) {
    console.error(error);
  }
};

export const pinFileToIPFS = async (blob: File) => {
  try {
      const data = new FormData();
      data.append("file", blob);
      const res = await fetch(
          "https://api.pinata.cloud/pinning/pinFileToIPFS",
          {
              method: "POST",
              headers: {
                  Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
              },
              body: data,
          }
      );
      const resData = await res.json();
      return resData;
  } catch (error) {
      console.log(error);
  }
};

export const uploadImage = async (url: string) => {
  const res = await fetch(url);
  const blob = await res.blob();

  const imageFile = new File([blob], "image.png", { type: "image/png" });
  const resData = await pinFileToIPFS(imageFile);
  if (resData) {
      return `https://gateway.pinata.cloud/ipfs/${resData.IpfsHash}`;
  } else {
      return false;
  }
};