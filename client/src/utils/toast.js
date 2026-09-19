import { toast } from "react-toastify";

const toastOptions = {
  position: "top-center",
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

export const showSuccess = (message) => {
  toast.success(message, {
    ...toastOptions,
    autoClose: 2500,
  });
};

export const showError = (message) => {
  toast.error(message, {
    ...toastOptions,
    autoClose: 4000,
  });
};

export const showWarning = (message) => {
  toast.warning(message, {
    ...toastOptions,
    autoClose: 3500,
  });
};

export const showInfo = (message) => {
  toast.info(message, {
    ...toastOptions,
    autoClose: 3000,
  });
};

export const dismissAllToasts = () => {
  toast.dismiss();
};