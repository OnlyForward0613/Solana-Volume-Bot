import { RootState } from "@/redux/store";
import Link from "next/link";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

const useNotifications = () => {
  const data = useSelector((state: RootState) => state.notification);

  useEffect(() => {
    if (data.message) {
      toast.success(
        <div>
          {data.message}{" "}
          <Link
            className="text-primary underline"
            href={`https://solscan.io/tx/${data.signature}`}
            target="_blank"
          >
            detail
          </Link>
        </div>,
        {
          position: "top-right",
          pauseOnFocusLoss: true,
          hideProgressBar: false,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          autoClose: false,
        }
      );
    }
  }, [data]);
};

export default useNotifications;
