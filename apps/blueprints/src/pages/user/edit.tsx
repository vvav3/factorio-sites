import React from "react";
import { NextPage } from "next";
import { useRouter } from "next/router";
import {
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  SimpleGrid,
  Button,
} from "@chakra-ui/react";
import { Formik, Field } from "formik";
import { css } from "@emotion/react";
import { Panel } from "../../components/Panel";
import { validateUserForm } from "../../utils/validate";
import { useAuth } from "../../providers/auth";

const FieldStyle = css`
  margin-bottom: 1rem;
`;

export const UserEdit: NextPage = () => {
  const auth = useAuth();
  const router = useRouter();

  if (!auth) {
    router.push("/");
  }

  return (
    <div css={{ margin: "0.7rem" }}>
      <SimpleGrid columns={1} margin="0 auto" maxWidth="600px">
        <Panel title="Account settings">
          <Formik
            initialValues={{ username: auth?.username ?? "", email: auth?.email ?? "" }}
            validate={validateUserForm(auth)}
            onSubmit={async (values, { setSubmitting, setErrors }) => {
              const result = await fetch("/api/user/edit", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(values),
              }).then((res) => res.json());

              if (result.errors) {
                setSubmitting(false);
                setErrors(result.errors);
              } else {
                // Update user session data
                router.reload();
              }
            }}
          >
            {({ isSubmitting, handleSubmit }) => (
              <form onSubmit={handleSubmit}>
                <Field name="email">
                  {({ field, meta }: any) => (
                    <FormControl
                      id="email"
                      isRequired={!auth?.steam_id}
                      isInvalid={meta.touched && meta.error}
                      css={FieldStyle}
                    >
                      <FormLabel>Email address</FormLabel>
                      <Input type="text" {...field} />
                      <FormErrorMessage>{meta.error}</FormErrorMessage>
                    </FormControl>
                  )}
                </Field>

                <Field name="username">
                  {({ field, meta }: any) => (
                    <FormControl
                      id="username"
                      isRequired
                      isInvalid={meta.touched && meta.error}
                      css={FieldStyle}
                    >
                      <FormLabel>Username</FormLabel>
                      <Input type="text" {...field} />
                      <FormErrorMessage>{meta.error}</FormErrorMessage>
                    </FormControl>
                  )}
                </Field>

                <Button type="submit" colorScheme="green" disabled={isSubmitting}>
                  Save
                </Button>
              </form>
            )}
          </Formik>
        </Panel>
      </SimpleGrid>
    </div>
  );
};

export default UserEdit;
