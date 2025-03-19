/* eslint-disable react/prop-types */
import React, { useState, useEffect } from "react";
import { useForm, useFieldArray, SubmitHandler } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FloatingLabelInput } from "@/components/ui/FloatingLabelInput";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import LoadingSpinner from "@/components/layout/LoadingSpinner";
import AlertBox from "@/components/ui/AlertBox";
import { useAuth } from "@/providers/AuthProvider";
import { v4 as uuidv4 } from "uuid";

// ----- Type Definitions -----
interface BandMember {
  name: string;
}

interface BandData {
  bandName: string;
  bandMembers: BandMember[];
  bandID: string;
}

interface BandFormValues {
  bandName: string;
  bandMembers: BandMember[];
  status?: string; // Add the optional 'status' property
}

interface AddBandComponentProps {
  item?: BandData;
  clearItem?: () => void;
  redirectEdit?: (destination: string) => void;
}

// ----- Component -----
const AddBandComponent: React.FC<AddBandComponentProps> = ({
  item,
  clearItem,
  redirectEdit,
}) => {
  const { userDetails } = useAuth();
  // Assume userDetails has a userId property; adjust if needed.
  const userId: string = userDetails ? (userDetails as any).userId : "";

  const {
    control,
    formState: { errors },
    register,
    handleSubmit,
    setValue,
    reset,
  } = useForm<BandFormValues>({
    defaultValues: {},
  });

  const [onLoad, setOnLoading] = useState<boolean>(false);
  const [showDialog, setShowDialog] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>(
    "You have successfully created your band!"
  );

  // useFieldArray for dynamic bandMembers
  const {
    fields: bandMembers,
    append: appendBandMembers,
    remove: removeBandMembers,
  } = useFieldArray({
    control,
    name: "bandMembers",
  });

  // When the component mounts or when "item" changes, pre-populate the form.
  useEffect(() => {
    reset();
    if (item) {
      // Update mode: set form values and append band members from item.
      setValue("bandName", item.bandName);
      item.bandMembers.forEach((bandMember) =>
        appendBandMembers({ name: bandMember.name })
      );
    } else {
      // Creation mode: start with one empty band member.
      appendBandMembers({ name: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  const successSubmit = () => {
    reset();
    // Append one empty band member after reset.
    appendBandMembers({ name: "" });
  };

  const handleFormSubmit: SubmitHandler<BandFormValues> = async (data) => {
    setOnLoading(true);
    try {
      const db = getFirestore();

      if (item) {
        // Update existing band
        const bandsRef = collection(db, "bands");
        const q = query(bandsRef, where("bandID", "==", item.bandID));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const bandDoc = querySnapshot.docs[0];
          await updateDoc(doc(db, "bands", bandDoc.id), {
            ...data,
            updatedTimestamp: serverTimestamp(),
          });
          setSuccessMessage("You have successfully updated your band!");
        } else {
          throw new Error("Band not found");
        }
      } else {
        // Create new band
        data["status"] = "active";
        await addDoc(collection(db, "bands"), {
          ...data,
          timestamp: serverTimestamp(),
          updatedTimestamp: "",
          userId: userId,
          bandID: uuidv4(),
        });
        setSuccessMessage("You have successfully created your band!");
      }

      setOnLoading(false);
      setShowDialog(true);
    } catch (error) {
      console.error("Error saving band data:", error);
      setOnLoading(false);
    }
  };

  const handleCancel = () => {
    if (clearItem) {
      clearItem();
    }
    if (redirectEdit) {
      redirectEdit("Bands");
    }
  };

  return (
    <div>
      {onLoad && <LoadingSpinner />}

      <form
        className="mt-8 flex justify-center"
        onSubmit={handleSubmit(handleFormSubmit)}
      >
        <div className="w-[50%]">
          <FloatingLabelInput
            label="Band Name"
            {...register("bandName", {
              required: "Band name is required",
            })}
            error={errors.bandName?.message}
          />
          <div className="w-full mt-5">
            <div>Band Members</div>
            {bandMembers.map((field, index) => (
              <div key={field.id} className="w-full">
                <div className="my-3 flex w-full">
                  <div className="w-[90%]">
                    <FloatingLabelInput
                      label="Name to display"
                      {...register(`bandMembers.${index}.name` as const, {
                        required: "This field is required",
                      })}
                      error={errors.bandMembers?.[index]?.name?.message}
                    />
                  </div>
                  {index !== 0 && (
                    <button
                      type="button"
                      onClick={() => removeBandMembers(index)}
                      className="ml-2"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => appendBandMembers({ name: "" })}
              className="mt-4 text-accent"
            >
              Add more band member
            </button>
          </div>

          <div className="flex justify-end">
            {item ? (
              <div className="flex space-x-2">
                <Button
                  type="button"
                  onClick={handleCancel}
                  className="bg-red-600 hover:bg-red-600/90 text-white w-32 mt-2 ml-2"
                >
                  <span className="self-stretch my-auto">Cancel Update</span>
                </Button>
                <Button
                  type="submit"
                  className="bg-accent hover:bg-accent/90 text-white w-32 mt-2"
                >
                  <span className="self-stretch my-auto">Update band</span>
                </Button>
              </div>
            ) : (
              <Button
                type="submit"
                className="bg-accent hover:bg-accent/90 text-white w-24 mt-2"
              >
                <span className="self-stretch my-auto">Save band</span>
              </Button>
            )}
          </div>
        </div>
      </form>
      <AlertBox
        showDialog={showDialog}
        setShowDialog={setShowDialog}
        onstepComplete={() => {
          setShowDialog(false);
          successSubmit();
          if (redirectEdit) {
            redirectEdit("Bands");
          }
        }}
        title="Success!"
        description={successMessage}
      />
    </div>
  );
};

export default AddBandComponent;
