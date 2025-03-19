import { NextResponse, type NextRequest } from "next/server";
import { pinata } from "@/utils/config";

export async function POST(request: NextRequest) {
  try {
    // Determine the Content-Type to decide handling of file or json
    const contentType = request.headers.get("content-type") || "";

    let uploadData;

    if (contentType.includes("multipart/form-data")) {
      // Handle file upload
      const data = await request.formData();
      const file = data.get("file") as File;

      if (file) {
        uploadData = await pinata.upload.file(file);
      } else {
        return NextResponse.json(
          { error: "File not found in the request" },
          { status: 400 }
        );
      }
    } else if (contentType.includes("application/json")) {
      // Handle JSON upload
      const jsonData = await request.json();

      if (jsonData) {
        uploadData = await pinata.upload.json(jsonData);
      } else {
        return NextResponse.json(
          { error: "Invalid JSON data" },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Unsupported Content-Type" },
        { status: 400 }
      );
    }

    // Get the IPFS URL for the uploaded data
    if (uploadData && uploadData.IpfsHash) {
      const url = await pinata.gateways.convert(uploadData.IpfsHash);
      return NextResponse.json(url, { status: 200 });
    } else {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
