"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, useFieldArray, useFormState } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Gender } from "@/types/user.types";
import { useTeamsMutations } from "@/hooks/api/use-teams";

const TeamMemberSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(11, "Full name must be at least 11 characters"),
  gender: z
    .nativeEnum(Gender, {
      errorMap: () => ({ message: "Invalid gender" }),
    })
    .nullable()
    .optional(),
  phoneNumber: z.string().optional(),
  email: z
    .string()
    .optional()
    .refine((val) => !val || /\S+@\S+\.\S+/.test(val), {
      message: "Invalid email format",
    }),
  province: z.string().min(1, "Province is required"),
  ward: z.string().min(1, "Ward is required"),
  organization: z.string().optional(),
  organizationAddress: z.string().optional(),
});

const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Team name is required"),
  teamMembers: z
    .array(TeamMemberSchema)
    .min(1, "At least one team member is required"),
  referralSource: z.string().min(1, "Please select how you heard about us"),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions",
  }),
});

type FormValues = z.infer<typeof formSchema>;

const referralOptions = [
  { value: "press", label: "Press" },
  { value: "school", label: "School" },
  { value: "email", label: "Email from STEAM for Vietnam" },
  { value: "facebook", label: "Facebook" },
  { value: "friend", label: "Friend or Family" },
  { value: "other", label: "Other" },
];

export default function TeamForm({
  defaultValues,
}: {
  defaultValues?: FormValues;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const params = useParams();
  const { createTeam, updateTeam } = useTeamsMutations();
  const isEditMode = Boolean(defaultValues && defaultValues.id);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: defaultValues || {
      name: "",
      teamMembers: [
        {
          name: "",
          gender: null,
          phoneNumber: "",
          email: "",
          province: "",
          ward: "",
          organization: "",
          organizationAddress: "",
        },
      ],
      referralSource: "",
      termsAccepted: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    name: "teamMembers",
    control: form.control,
  });
  const { dirtyFields } = useFormState({ control: form.control });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      if (isEditMode && defaultValues?.id) {
        const payload: any = {
          id: defaultValues.id,
        };

        if (dirtyFields.name) payload.name = data.name;
        if (dirtyFields.referralSource)
          payload.referralSource = data.referralSource;

        const dirtyMembers: any[] = [];

        data.teamMembers?.forEach((member, index) => {
          const isNew = !member.id;
          const dirty = (dirtyFields.teamMembers?.[index] || {}) as Partial<
            typeof member
          >;

          const baseData = isNew
            ? member
            : Object.fromEntries(
                Object.entries(member).filter(
                  ([key, value]) =>
                    dirty.hasOwnProperty(key) &&
                    value !== null &&
                    value !== undefined
                )
              );

          if (isNew || member.id) {
            dirtyMembers.push({
              ...(member.id && { id: member.id }),
              ...baseData,
            });
          }
        });

        if (dirtyMembers.length > 0) {
          payload.teamMembers = dirtyMembers;
        }
        console.log("Submitting update with payload:", payload);

        await updateTeam.mutateAsync(payload);
      } else {
        await createTeam.mutateAsync({
          name: data.name,
          tournamentId: params.id as string,
          referralSource: data.referralSource,
          teamMembers: data.teamMembers || [],
        });
        router.push("/tournaments");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-start bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-3xl shadow-lg">
        <CardHeader>
          <CardTitle>Team Registration</CardTitle>
          <CardDescription>
            Please fill in all required information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Name</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                {fields.map((field, index) => (
                  <Card key={field.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{`Member ${
                        index + 1
                      }`}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`teamMembers.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input {...field} disabled={isLoading} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`teamMembers.${index}.gender`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Gender</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value ?? ""}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select gender" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value={Gender.MALE}>
                                    Male
                                  </SelectItem>
                                  <SelectItem value={Gender.FEMALE}>
                                    Female
                                  </SelectItem>
                                  <SelectItem value={Gender.OTHER}>
                                    Other
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex flex-col space-y-4">
                        <FormField
                          control={form.control}
                          name={`teamMembers.${index}.email`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  {...field}
                                  disabled={isLoading}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`teamMembers.${index}.phoneNumber`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input {...field} disabled={isLoading} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`teamMembers.${index}.province`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Province/City</FormLabel>
                              <FormControl>
                                <Input {...field} disabled={isLoading} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`teamMembers.${index}.ward`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>District</FormLabel>
                              <FormControl>
                                <Input {...field} disabled={isLoading} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`teamMembers.${index}.organization`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>School/Organization</FormLabel>
                              <FormControl>
                                <Input {...field} disabled={isLoading} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`teamMembers.${index}.organizationAddress`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>School/Organization Address</FormLabel>
                              <FormControl>
                                <Input {...field} disabled={isLoading} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {index > 0 && (
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => remove(index)}
                          className="mt-2"
                          disabled={isLoading}
                        >
                          Remove Member
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  append({
                    name: "",
                    gender: null,
                    phoneNumber: "",
                    email: "",
                    province: "",
                    ward: "",
                    organization: "",
                    organizationAddress: "",
                  })
                }
                disabled={isLoading}
              >
                Add Member
              </Button>

              <FormField
                control={form.control}
                name="referralSource"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>How did you hear about us?</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {referralOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="termsAccepted"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Please read and agree to the terms and conditions of
                        participation
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading
                  ? isEditMode
                    ? "Updating..."
                    : "Processing..."
                  : isEditMode
                  ? "Update"
                  : "Register"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
