// This file is part of MinIO Operator
// Copyright (c) 2023 MinIO, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import React, { Fragment, useEffect, useState } from "react";
import {
  Box,
  Button,
  CodeEditor,
  FileSelector,
  FormLayout,
  Grid,
  InformativeMessage,
  InputBox,
  RadioGroup,
  SectionTitle,
  Switch,
  Tabs,
} from "mds";
import { modalStyleUtils } from "../../Common/FormComponents/common/styleLibrary";
import { useSelector } from "react-redux";
import { ICertificateInfo, ITenantEncryptionResponse } from "../types";
import { AppState, useAppDispatch } from "../../../../store";
import { ErrorResponseHandler } from "../../../../common/types";
import { KeyPair } from "../ListTenants/utils";
import { clearValidationError } from "../utils";
import {
  commonFormValidation,
  IValidation,
} from "../../../../utils/validationFunctions";
import { setErrorSnackMessage } from "../../../../systemSlice";
import { SecurityContext } from "../../../../api/operatorApi";
import api from "../../../../common/api";
import ConfirmDialog from "../../Common/ModalWrapper/ConfirmDialog";
import TLSCertificate from "../../Common/TLSCertificate/TLSCertificate";
import KMSPolicyInfo from "./KMSPolicyInfo";

const TenantEncryption = () => {
  const dispatch = useAppDispatch();

  const tenant = useSelector((state: AppState) => state.tenants.tenantInfo);
  const [editRawConfiguration, setEditRawConfiguration] =
    useState<string>("options");
  const [encryptionRawConfiguration, setEncryptionRawConfiguration] =
    useState<string>("");
  const [encryptionEnabled, setEncryptionEnabled] = useState<boolean>(false);
  const [encryptionType, setEncryptionType] = useState<string>("vault");
  const [replicas, setReplicas] = useState<string>("1");
  const [image, setImage] = useState<string>("");
  const [refreshEncryptionInfo, setRefreshEncryptionInfo] =
    useState<boolean>(false);
  const [securityContext, setSecurityContext] = useState<SecurityContext>({
    fsGroup: "1000",
    fsGroupChangePolicy: "Always",
    runAsGroup: "1000",
    runAsNonRoot: true,
    runAsUser: "1000",
  });
  const [policies, setPolicies] = useState<any>([]);
  const [vaultConfiguration, setVaultConfiguration] = useState<any>(null);
  const [awsConfiguration, setAWSConfiguration] = useState<any>(null);
  const [gemaltoConfiguration, setGemaltoConfiguration] = useState<any>(null);
  const [azureConfiguration, setAzureConfiguration] = useState<any>(null);
  const [gcpConfiguration, setGCPConfiguration] = useState<any>(null);
  const [enabledCustomCertificates, setEnabledCustomCertificates] =
    useState<boolean>(false);
  const [updatingEncryption, setUpdatingEncryption] = useState<boolean>(false);
  const [kesServerTLSCertificateSecret, setKesServerTLSCertificateSecret] =
    useState<ICertificateInfo | null>(null);
  const [minioMTLSCertificateSecret, setMinioMTLSCertificateSecret] =
    useState<ICertificateInfo | null>(null);
  const [minioMTLSCertificate, setMinioMTLSCertificate] =
    useState<KeyPair | null>(null);
  const [certificatesToBeRemoved, setCertificatesToBeRemoved] = useState<
    string[]
  >([]);
  const [isFormValid, setIsFormValid] = useState<boolean>(false);
  const [kmsMTLSCertificateSecret, setKmsMTLSCertificateSecret] =
    useState<ICertificateInfo | null>(null);
  const [kmsCACertificateSecret, setKMSCACertificateSecret] =
    useState<ICertificateInfo | null>(null);
  const [kmsMTLSCertificate, setKmsMTLSCertificate] = useState<KeyPair | null>(
    null,
  );
  const [kesServerCertificate, setKESServerCertificate] =
    useState<KeyPair | null>(null);
  const [kmsCACertificate, setKmsCACertificate] = useState<KeyPair | null>(
    null,
  );
  const [validationErrors, setValidationErrors] = useState<any>({});
  const cleanValidation = (fieldName: string) => {
    setValidationErrors(clearValidationError(validationErrors, fieldName));
  };
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);

  // Validation
  useEffect(() => {
    let encryptionValidation: IValidation[] = [];

    if (encryptionEnabled) {
      encryptionValidation = [
        {
          fieldKey: "replicas",
          required: true,
          value: replicas,
          customValidation: parseInt(replicas) < 1,
          customValidationMessage: "Replicas needs to be 1 or greater",
        },
        {
          fieldKey: "kes_securityContext_runAsUser",
          required: true,
          value: securityContext.runAsUser,
          customValidation:
            securityContext.runAsUser === "" ||
            parseInt(securityContext.runAsUser) < 0,
          customValidationMessage: `runAsUser must be present and be 0 or more`,
        },
        {
          fieldKey: "kes_securityContext_runAsGroup",
          required: true,
          value: securityContext.runAsGroup,
          customValidation:
            securityContext.runAsGroup === "" ||
            parseInt(securityContext.runAsGroup) < 0,
          customValidationMessage: `runAsGroup must be present and be 0 or more`,
        },
        {
          fieldKey: "kes_securityContext_fsGroup",
          required: true,
          value: securityContext.fsGroup!,
          customValidation:
            securityContext.fsGroup === "" ||
            parseInt(securityContext.fsGroup!) < 0,
          customValidationMessage: `fsGroup must be present and be 0 or more`,
        },
      ];

      if (enabledCustomCertificates) {
        encryptionValidation = [
          ...encryptionValidation,
          {
            fieldKey: "serverKey",
            required: false,
            value: kesServerCertificate?.encoded_key || "",
          },
          {
            fieldKey: "serverCert",
            required: false,
            value: kesServerCertificate?.encoded_cert || "",
          },
          {
            fieldKey: "clientKey",
            required: false,
            value: minioMTLSCertificate?.encoded_key || "",
          },
          {
            fieldKey: "clientCert",
            required: false,
            value: minioMTLSCertificate?.encoded_cert || "",
          },
        ];
      }

      if (encryptionType === "vault") {
        encryptionValidation = [
          ...encryptionValidation,
          {
            fieldKey: "vault_endpoint",
            required: true,
            value: vaultConfiguration?.endpoint,
          },
          {
            fieldKey: "vault_id",
            required: true,
            value: vaultConfiguration?.approle?.id,
          },
          {
            fieldKey: "vault_secret",
            required: true,
            value: vaultConfiguration?.approle?.secret,
          },
          {
            fieldKey: "vault_ping",
            required: false,
            value: vaultConfiguration?.status?.ping,
            customValidation: parseInt(vaultConfiguration?.status?.ping) < 0,
            customValidationMessage: "Value needs to be 0 or greater",
          },
          {
            fieldKey: "vault_retry",
            required: false,
            value: vaultConfiguration?.approle?.retry,
            customValidation: parseInt(vaultConfiguration?.approle?.retry) < 0,
            customValidationMessage: "Value needs to be 0 or greater",
          },
        ];
      }

      if (encryptionType === "aws") {
        encryptionValidation = [
          ...encryptionValidation,
          {
            fieldKey: "aws_endpoint",
            required: true,
            value: awsConfiguration?.secretsmanager?.endpoint,
          },
          {
            fieldKey: "aws_region",
            required: true,
            value: awsConfiguration?.secretsmanager?.region,
          },
          {
            fieldKey: "aws_accessKey",
            required: true,
            value: awsConfiguration?.secretsmanager?.credentials?.accesskey,
          },
          {
            fieldKey: "aws_secretKey",
            required: true,
            value: awsConfiguration?.secretsmanager?.credentials?.secretkey,
          },
        ];
      }

      if (encryptionType === "gemalto") {
        encryptionValidation = [
          ...encryptionValidation,
          {
            fieldKey: "gemalto_endpoint",
            required: true,
            value: gemaltoConfiguration?.keysecure?.endpoint,
          },
          {
            fieldKey: "gemalto_token",
            required: true,
            value: gemaltoConfiguration?.keysecure?.credentials?.token,
          },
          {
            fieldKey: "gemalto_domain",
            required: true,
            value: gemaltoConfiguration?.keysecure?.credentials?.domain,
          },
          {
            fieldKey: "gemalto_retry",
            required: false,
            value: gemaltoConfiguration?.keysecure?.credentials?.retry,
            customValidation:
              parseInt(gemaltoConfiguration?.keysecure?.credentials?.retry) < 0,
            customValidationMessage: "Value needs to be 0 or greater",
          },
        ];
      }

      if (encryptionType === "azure") {
        encryptionValidation = [
          ...encryptionValidation,
          {
            fieldKey: "azure_endpoint",
            required: true,
            value: azureConfiguration?.keyvault?.endpoint,
          },
          {
            fieldKey: "azure_tenant_id",
            required: true,
            value: azureConfiguration?.keyvault?.credentials?.tenant_id,
          },
          {
            fieldKey: "azure_client_id",
            required: true,
            value: azureConfiguration?.keyvault?.credentials?.client_id,
          },
          {
            fieldKey: "azure_client_secret",
            required: true,
            value: azureConfiguration?.keyvault?.credentials?.client_secret,
          },
        ];
      }
    }

    const commonVal = commonFormValidation(encryptionValidation);

    setIsFormValid(Object.keys(commonVal).length === 0);

    setValidationErrors(commonVal);
  }, [
    enabledCustomCertificates,
    encryptionEnabled,
    encryptionType,
    kesServerCertificate?.encoded_key,
    kesServerCertificate?.encoded_cert,
    minioMTLSCertificate?.encoded_key,
    minioMTLSCertificate?.encoded_cert,
    kmsMTLSCertificate?.encoded_key,
    kmsMTLSCertificate?.encoded_cert,
    kmsCACertificate?.encoded_key,
    kmsCACertificate?.encoded_cert,
    securityContext,
    vaultConfiguration,
    awsConfiguration,
    gemaltoConfiguration,
    azureConfiguration,
    gcpConfiguration,
    replicas,
  ]);

  const fetchEncryptionInfo = () => {
    if (!refreshEncryptionInfo && tenant?.namespace && tenant?.name) {
      setRefreshEncryptionInfo(true);
      api
        .invoke(
          "GET",
          `/api/v1/namespaces/${tenant?.namespace}/tenants/${tenant?.name}/encryption`,
        )
        .then((resp: ITenantEncryptionResponse) => {
          setEncryptionRawConfiguration(resp.raw);
          if (resp.policies) {
            setPolicies(resp.policies);
          }
          if (resp.vault) {
            setEncryptionType("vault");
            setVaultConfiguration(resp.vault);
          } else if (resp.aws) {
            setEncryptionType("aws");
            setAWSConfiguration(resp.aws);
          } else if (resp.gemalto) {
            setEncryptionType("gemalto");
            setGemaltoConfiguration(resp.gemalto);
          } else if (resp.gcp) {
            setEncryptionType("gcp");
            setGCPConfiguration(resp.gcp);
          } else if (resp.azure) {
            setEncryptionType("azure");
            setAzureConfiguration(resp.azure);
          }

          setEncryptionEnabled(true);
          setImage(resp.image);
          setReplicas(resp.replicas);
          if (resp.securityContext) {
            setSecurityContext(resp.securityContext);
          }
          if (resp.server_tls || resp.minio_mtls || resp.kms_mtls) {
            setEnabledCustomCertificates(true);
          }
          if (resp.server_tls) {
            setKesServerTLSCertificateSecret(resp.server_tls);
          }
          if (resp.minio_mtls) {
            setMinioMTLSCertificateSecret(resp.minio_mtls);
          }
          if (resp.kms_mtls) {
            setKmsMTLSCertificateSecret(resp.kms_mtls.crt);
            setKMSCACertificateSecret(resp.kms_mtls.ca);
          }
          setRefreshEncryptionInfo(false);
        })
        .catch((err: ErrorResponseHandler) => {
          console.error(err);
          setRefreshEncryptionInfo(false);
        });
    }
  };

  useEffect(() => {
    fetchEncryptionInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant]);

  const removeCertificate = (certificateInfo: ICertificateInfo) => {
    setCertificatesToBeRemoved([
      ...certificatesToBeRemoved,
      certificateInfo.name,
    ]);
    if (certificateInfo.name === kesServerTLSCertificateSecret?.name) {
      setKesServerTLSCertificateSecret(null);
    }
    if (certificateInfo.name === minioMTLSCertificateSecret?.name) {
      setMinioMTLSCertificateSecret(null);
    }
    if (certificateInfo.name === kmsMTLSCertificateSecret?.name) {
      setKmsMTLSCertificateSecret(null);
    }
    if (certificateInfo.name === kmsCACertificateSecret?.name) {
      setKMSCACertificateSecret(null);
    }
  };

  const updateEncryptionConfiguration = () => {
    if (encryptionEnabled) {
      let insertEncrypt = {};
      switch (encryptionType) {
        case "gemalto":
          insertEncrypt = {
            gemalto: {
              keysecure: {
                endpoint: gemaltoConfiguration?.keysecure?.endpoint || "",
                credentials: {
                  token:
                    gemaltoConfiguration?.keysecure?.credentials?.token || "",
                  domain:
                    gemaltoConfiguration?.keysecure?.credentials?.domain || "",
                  retry: parseInt(
                    gemaltoConfiguration?.keysecure?.credentials?.retry,
                  ),
                },
              },
            },
          };
          break;
        case "aws":
          insertEncrypt = {
            aws: {
              secretsmanager: {
                endpoint: awsConfiguration?.secretsmanager?.endpoint || "",
                region: awsConfiguration?.secretsmanager?.region || "",
                kmskey: awsConfiguration?.secretsmanager?.kmskey || "",
                credentials: {
                  accesskey:
                    awsConfiguration?.secretsmanager?.credentials?.accesskey ||
                    "",
                  secretkey:
                    awsConfiguration?.secretsmanager?.credentials?.secretkey ||
                    "",
                  token:
                    awsConfiguration?.secretsmanager?.credentials?.token || "",
                },
              },
            },
          };
          break;
        case "azure":
          insertEncrypt = {
            azure: {
              keyvault: {
                endpoint: azureConfiguration?.keyvault?.endpoint || "",
                credentials: {
                  tenant_id:
                    azureConfiguration?.keyvault?.credentials?.tenant_id || "",
                  client_id:
                    azureConfiguration?.keyvault?.credentials?.client_id || "",
                  client_secret:
                    azureConfiguration?.keyvault?.credentials?.client_secret ||
                    "",
                },
              },
            },
          };
          break;
        case "gcp":
          insertEncrypt = {
            gcp: {
              secretmanager: {
                project_id: gcpConfiguration?.secretmanager?.project_id || "",
                endpoint: gcpConfiguration?.secretmanager?.endpoint || "",
                credentials: {
                  client_email:
                    gcpConfiguration?.secretmanager?.credentials
                      ?.client_email || "",
                  client_id:
                    gcpConfiguration?.secretmanager?.credentials?.client_id ||
                    "",
                  private_key_id:
                    gcpConfiguration?.secretmanager?.credentials
                      ?.private_key_id || "",
                  private_key:
                    gcpConfiguration?.secretmanager?.credentials?.private_key ||
                    "",
                },
              },
            },
          };
          break;
        case "vault":
          insertEncrypt = {
            vault: {
              endpoint: vaultConfiguration?.endpoint || "",
              engine: vaultConfiguration?.engine || "",
              namespace: vaultConfiguration?.namespace || "",
              prefix: vaultConfiguration?.prefix || "",
              approle: {
                engine: vaultConfiguration?.approle?.engine || "",
                id: vaultConfiguration?.approle?.id || "",
                secret: vaultConfiguration?.approle?.secret || "",
                retry: parseInt(vaultConfiguration?.approle?.retry),
              },
              status: {
                ping: parseInt(vaultConfiguration?.status?.ping),
              },
            },
          };
          break;
      }

      let encryptionServerKeyPair: any = {};
      let encryptionClientKeyPair: any = {};
      let encryptionKMSCertificates: any = {};

      // MinIO -> KES (mTLS certificates)
      if (
        minioMTLSCertificate?.encoded_key &&
        minioMTLSCertificate?.encoded_cert
      ) {
        encryptionClientKeyPair = {
          minio_mtls: {
            key: minioMTLSCertificate?.encoded_key,
            crt: minioMTLSCertificate?.encoded_cert,
          },
        };
      }

      // KES server certificates
      if (
        kesServerCertificate?.encoded_key &&
        kesServerCertificate?.encoded_cert
      ) {
        encryptionServerKeyPair = {
          server_tls: {
            key: kesServerCertificate?.encoded_key,
            crt: kesServerCertificate?.encoded_cert,
          },
        };
      }

      // KES -> KMS (mTLS certificates)
      let kmsMTLSKeyPair = null;
      let kmsCAInsert = null;
      if (kmsMTLSCertificate?.encoded_key && kmsMTLSCertificate?.encoded_cert) {
        kmsMTLSKeyPair = {
          key: kmsMTLSCertificate?.encoded_key,
          crt: kmsMTLSCertificate?.encoded_cert,
        };
      }
      if (kmsCACertificate?.encoded_cert) {
        kmsCAInsert = {
          ca: kmsCACertificate?.encoded_cert,
        };
      }
      if (kmsMTLSKeyPair || kmsCAInsert) {
        encryptionKMSCertificates = {
          kms_mtls: {
            ...kmsMTLSKeyPair,
            ...kmsCAInsert,
          },
        };
      }

      const dataSend = {
        raw:
          editRawConfiguration === "raw-edit" ? encryptionRawConfiguration : "",
        secretsToBeDeleted: certificatesToBeRemoved || [],
        replicas: replicas,
        securityContext: securityContext,
        image: image,
        ...encryptionClientKeyPair,
        ...encryptionServerKeyPair,
        ...encryptionKMSCertificates,
        ...insertEncrypt,
      };
      if (!updatingEncryption) {
        setUpdatingEncryption(true);
        api
          .invoke(
            "PUT",
            `/api/v1/namespaces/${tenant?.namespace}/tenants/${tenant?.name}/encryption`,
            dataSend,
          )
          .then(() => {
            setConfirmOpen(false);
            setUpdatingEncryption(false);
            fetchEncryptionInfo();
          })
          .catch((err: ErrorResponseHandler) => {
            setUpdatingEncryption(false);
            dispatch(setErrorSnackMessage(err));
          });
      }
    } else {
      if (!updatingEncryption) {
        setUpdatingEncryption(true);
        api
          .invoke(
            "DELETE",
            `/api/v1/namespaces/${tenant?.namespace}/tenants/${tenant?.name}/encryption`,
            {},
          )
          .then(() => {
            setConfirmOpen(false);
            setUpdatingEncryption(false);
            fetchEncryptionInfo();
          })
          .catch((err: ErrorResponseHandler) => {
            setUpdatingEncryption(false);
            dispatch(setErrorSnackMessage(err));
          });
      }
    }
  };

  return (
    <React.Fragment>
      {confirmOpen && (
        <ConfirmDialog
          isOpen={confirmOpen}
          title={
            encryptionEnabled
              ? "Enable encryption at rest for tenant?"
              : "Disable encryption at rest for tenant?"
          }
          confirmText={encryptionEnabled ? "Enable" : "Disable"}
          cancelText="Cancel"
          onClose={() => setConfirmOpen(false)}
          onConfirm={updateEncryptionConfiguration}
          confirmationContent={
            <Fragment>
              {encryptionEnabled
                ? "Data will be encrypted using and external KMS"
                : "Current encrypted information will not be accessible"}
              {encryptionEnabled && (
                <InformativeMessage
                  title={"Warning"}
                  message={
                    "The content of the KES config secret will be overwritten."
                  }
                  variant={"warning"}
                  sx={{ margin: "15px 0" }}
                />
              )}
            </Fragment>
          }
        />
      )}
      <FormLayout containerPadding={false} withBorders={false}>
        <Grid container>
          <Grid item xs>
            <SectionTitle
              separator
              actions={
                <Fragment>
                  <Switch
                    label={""}
                    indicatorLabels={["Enabled", "Disabled"]}
                    checked={encryptionEnabled}
                    value={"tenant_encryption"}
                    id="tenant-encryption"
                    name="tenant-encryption"
                    onChange={() => {
                      setEncryptionEnabled(!encryptionEnabled);
                    }}
                    description=""
                  />
                </Fragment>
              }
            >
              Encryption
            </SectionTitle>
          </Grid>
          {encryptionEnabled && (
            <Fragment>
              <Grid item xs={12}>
                <Tabs
                  options={[
                    {
                      tabConfig: { label: "Options", id: "options" },
                      content: (
                        <Fragment>
                          <KMSPolicyInfo policies={policies} />
                          <RadioGroup
                            currentValue={encryptionType}
                            id="encryptionType"
                            name="encryptionType"
                            label="KMS"
                            onChange={(e) => {
                              setEncryptionType(e.target.value);
                            }}
                            selectorOptions={[
                              { label: "Vault", value: "vault" },
                              { label: "AWS", value: "aws" },
                              { label: "Gemalto", value: "gemalto" },
                              { label: "GCP", value: "gcp" },
                              { label: "Azure", value: "azure" },
                            ]}
                          />

                          {encryptionType === "vault" && (
                            <Fragment>
                              <InputBox
                                id="vault_endpoint"
                                name="vault_endpoint"
                                onChange={(
                                  e: React.ChangeEvent<HTMLInputElement>,
                                ) =>
                                  setVaultConfiguration({
                                    ...vaultConfiguration,
                                    endpoint: e.target.value,
                                  })
                                }
                                label="Endpoint"
                                tooltip="Endpoint is the Hashicorp Vault endpoint"
                                value={vaultConfiguration?.endpoint || ""}
                                error={validationErrors["vault_ping"] || ""}
                                required
                              />
                              <InputBox
                                id="vault_engine"
                                name="vault_engine"
                                onChange={(
                                  e: React.ChangeEvent<HTMLInputElement>,
                                ) =>
                                  setVaultConfiguration({
                                    ...vaultConfiguration,
                                    engine: e.target.value,
                                  })
                                }
                                label="Engine"
                                tooltip="Engine is the Hashicorp Vault K/V engine path. If empty, defaults to 'kv'"
                                value={vaultConfiguration?.engine || ""}
                              />
                              <InputBox
                                id="vault_namespace"
                                name="vault_namespace"
                                onChange={(
                                  e: React.ChangeEvent<HTMLInputElement>,
                                ) =>
                                  setVaultConfiguration({
                                    ...vaultConfiguration,
                                    namespace: e.target.value,
                                  })
                                }
                                label="Namespace"
                                tooltip="Namespace is an optional Hashicorp Vault namespace. An empty namespace means no particular namespace is used."
                                value={vaultConfiguration?.namespace || ""}
                              />
                              <InputBox
                                id="vault_prefix"
                                name="vault_prefix"
                                onChange={(
                                  e: React.ChangeEvent<HTMLInputElement>,
                                ) =>
                                  setVaultConfiguration({
                                    ...vaultConfiguration,
                                    prefix: e.target.value,
                                  })
                                }
                                label="Prefix"
                                tooltip="Prefix is an optional prefix / directory within the K/V engine. If empty, keys will be stored at the K/V engine top level"
                                value={vaultConfiguration?.prefix || ""}
                              />
                              <SectionTitle>App Role</SectionTitle>
                              <fieldset className={"inputItem"}>
                                <legend>App Role</legend>
                                <InputBox
                                  id="vault_approle_engine"
                                  name="vault_approle_engine"
                                  onChange={(
                                    e: React.ChangeEvent<HTMLInputElement>,
                                  ) =>
                                    setVaultConfiguration({
                                      ...vaultConfiguration,
                                      approle: {
                                        ...vaultConfiguration?.approle,
                                        engine: e.target.value,
                                      },
                                    })
                                  }
                                  label="Engine"
                                  tooltip="AppRoleEngine is the AppRole authentication engine path. If empty, defaults to 'approle'"
                                  value={
                                    vaultConfiguration?.approle?.engine || ""
                                  }
                                />
                                <InputBox
                                  type={"password"}
                                  id="vault_id"
                                  name="vault_id"
                                  onChange={(
                                    e: React.ChangeEvent<HTMLInputElement>,
                                  ) =>
                                    setVaultConfiguration({
                                      ...vaultConfiguration,
                                      approle: {
                                        ...vaultConfiguration?.approle,
                                        id: e.target.value,
                                      },
                                    })
                                  }
                                  label="AppRole ID"
                                  tooltip="AppRoleSecret is the AppRole access secret for authenticating to Hashicorp Vault via the AppRole method"
                                  value={vaultConfiguration?.approle?.id || ""}
                                  required
                                  error={validationErrors["vault_id"] || ""}
                                />
                                <InputBox
                                  type={"password"}
                                  id="vault_secret"
                                  name="vault_secret"
                                  onChange={(
                                    e: React.ChangeEvent<HTMLInputElement>,
                                  ) =>
                                    setVaultConfiguration({
                                      ...vaultConfiguration,
                                      approle: {
                                        ...vaultConfiguration?.approle,
                                        secret: e.target.value,
                                      },
                                    })
                                  }
                                  label="AppRole Secret"
                                  tooltip="AppRoleSecret is the AppRole access secret for authenticating to Hashicorp Vault via the AppRole method"
                                  value={
                                    vaultConfiguration?.approle?.secret || ""
                                  }
                                  required
                                  error={validationErrors["vault_secret"] || ""}
                                />
                                <InputBox
                                  type="number"
                                  min="0"
                                  id="vault_retry"
                                  name="vault_retry"
                                  onChange={(
                                    e: React.ChangeEvent<HTMLInputElement>,
                                  ) =>
                                    setVaultConfiguration({
                                      ...vaultConfiguration,
                                      approle: {
                                        ...vaultConfiguration?.approle,
                                        retry: e.target.value,
                                      },
                                    })
                                  }
                                  label="Retry (Seconds)"
                                  error={validationErrors["vault_retry"] || ""}
                                  value={
                                    vaultConfiguration?.approle?.retry || ""
                                  }
                                />
                              </fieldset>
                              <fieldset className={"inputItem"}>
                                <legend>Status</legend>
                                <InputBox
                                  type="number"
                                  min="0"
                                  id="vault_ping"
                                  name="vault_ping"
                                  onChange={(
                                    e: React.ChangeEvent<HTMLInputElement>,
                                  ) =>
                                    setVaultConfiguration({
                                      ...vaultConfiguration,
                                      status: {
                                        ...vaultConfiguration?.status,
                                        ping: e.target.value,
                                      },
                                    })
                                  }
                                  label="Ping (Seconds)"
                                  tooltip="controls how often to Vault health status is checked. If not set, defaults to 10s"
                                  error={validationErrors["vault_ping"] || ""}
                                  value={vaultConfiguration?.status?.ping || ""}
                                />
                              </fieldset>
                            </Fragment>
                          )}
                          {encryptionType === "azure" && (
                            <Fragment>
                              <InputBox
                                id="azure_endpoint"
                                name="azure_endpoint"
                                onChange={(
                                  e: React.ChangeEvent<HTMLInputElement>,
                                ) =>
                                  setAzureConfiguration({
                                    ...azureConfiguration,
                                    keyvault: {
                                      ...azureConfiguration?.keyvault,
                                      endpoint: e.target.value,
                                    },
                                  })
                                }
                                label="Endpoint"
                                tooltip="Endpoint is the Azure KeyVault endpoint"
                                error={validationErrors["azure_endpoint"] || ""}
                                value={
                                  azureConfiguration?.keyvault?.endpoint || ""
                                }
                              />
                              <fieldset className={"inputItem"}>
                                <legend>Credentials</legend>
                                <InputBox
                                  id="azure_tenant_id"
                                  name="azure_tenant_id"
                                  onChange={(
                                    e: React.ChangeEvent<HTMLInputElement>,
                                  ) =>
                                    setAzureConfiguration({
                                      ...azureConfiguration,
                                      keyvault: {
                                        ...azureConfiguration?.keyvault,
                                        credentials: {
                                          ...azureConfiguration?.keyvault
                                            ?.credentials,
                                          tenant_id: e.target.value,
                                        },
                                      },
                                    })
                                  }
                                  label="Tenant ID"
                                  tooltip="TenantID is the ID of the Azure KeyVault tenant"
                                  value={
                                    azureConfiguration?.keyvault?.credentials
                                      ?.tenant_id || ""
                                  }
                                  error={
                                    validationErrors["azure_tenant_id"] || ""
                                  }
                                />
                                <InputBox
                                  id="azure_client_id"
                                  name="azure_client_id"
                                  onChange={(
                                    e: React.ChangeEvent<HTMLInputElement>,
                                  ) =>
                                    setAzureConfiguration({
                                      ...azureConfiguration,
                                      keyvault: {
                                        ...azureConfiguration?.keyvault,
                                        credentials: {
                                          ...azureConfiguration?.keyvault
                                            ?.credentials,
                                          client_id: e.target.value,
                                        },
                                      },
                                    })
                                  }
                                  label="Client ID"
                                  tooltip="ClientID is the ID of the client accessing Azure KeyVault"
                                  value={
                                    azureConfiguration?.keyvault?.credentials
                                      ?.client_id || ""
                                  }
                                  error={
                                    validationErrors["azure_client_id"] || ""
                                  }
                                />
                                <InputBox
                                  id="azure_client_secret"
                                  name="azure_client_secret"
                                  onChange={(
                                    e: React.ChangeEvent<HTMLInputElement>,
                                  ) =>
                                    setAzureConfiguration({
                                      ...azureConfiguration,
                                      keyvault: {
                                        ...azureConfiguration?.keyvault,
                                        credentials: {
                                          ...azureConfiguration?.keyvault
                                            ?.credentials,
                                          client_secret: e.target.value,
                                        },
                                      },
                                    })
                                  }
                                  label="Client Secret"
                                  tooltip="ClientSecret is the client secret accessing the Azure KeyVault"
                                  value={
                                    azureConfiguration?.keyvault?.credentials
                                      ?.client_secret || ""
                                  }
                                  error={
                                    validationErrors["azure_client_secret"] ||
                                    ""
                                  }
                                />
                              </fieldset>
                            </Fragment>
                          )}
                          {encryptionType === "gcp" && (
                            <Fragment>
                              <InputBox
                                id="gcp_project_id"
                                name="gcp_project_id"
                                onChange={(
                                  e: React.ChangeEvent<HTMLInputElement>,
                                ) =>
                                  setGCPConfiguration({
                                    ...gcpConfiguration,
                                    secretmanager: {
                                      ...gcpConfiguration?.secretmanager,
                                      project_id: e.target.value,
                                    },
                                  })
                                }
                                label="Project ID"
                                tooltip="ProjectID is the GCP project ID"
                                value={
                                  gcpConfiguration?.secretmanager.project_id ||
                                  ""
                                }
                              />
                              <InputBox
                                id="gcp_endpoint"
                                name="gcp_endpoint"
                                onChange={(
                                  e: React.ChangeEvent<HTMLInputElement>,
                                ) =>
                                  setGCPConfiguration({
                                    ...gcpConfiguration,
                                    secretmanager: {
                                      ...gcpConfiguration?.secretmanager,
                                      endpoint: e.target.value,
                                    },
                                  })
                                }
                                label="Endpoint"
                                tooltip="Endpoint is the GCP project ID. If empty defaults to: secretmanager.googleapis.com:443"
                                value={
                                  gcpConfiguration?.secretmanager.endpoint || ""
                                }
                              />
                              <fieldset className={"inputItem"}>
                                <legend>Credentials</legend>
                                <InputBox
                                  id="gcp_client_email"
                                  name="gcp_client_email"
                                  onChange={(
                                    e: React.ChangeEvent<HTMLInputElement>,
                                  ) =>
                                    setGCPConfiguration({
                                      ...gcpConfiguration,
                                      secretmanager: {
                                        ...gcpConfiguration?.secretmanager,
                                        credentials: {
                                          ...gcpConfiguration?.secretmanager
                                            .credentials,
                                          client_email: e.target.value,
                                        },
                                      },
                                    })
                                  }
                                  label="Client Email"
                                  tooltip="Is the Client email of the GCP service account used to access the SecretManager"
                                  value={
                                    gcpConfiguration?.secretmanager.credentials
                                      ?.client_email || ""
                                  }
                                />
                                <InputBox
                                  id="gcp_client_id"
                                  name="gcp_client_id"
                                  onChange={(
                                    e: React.ChangeEvent<HTMLInputElement>,
                                  ) =>
                                    setGCPConfiguration({
                                      ...gcpConfiguration,
                                      secretmanager: {
                                        ...gcpConfiguration?.secretmanager,
                                        credentials: {
                                          ...gcpConfiguration?.secretmanager
                                            .credentials,
                                          client_id: e.target.value,
                                        },
                                      },
                                    })
                                  }
                                  label="Client ID"
                                  tooltip="Is the Client ID of the GCP service account used to access the SecretManager"
                                  value={
                                    gcpConfiguration?.secretmanager.credentials
                                      ?.client_id || ""
                                  }
                                />
                                <InputBox
                                  id="gcp_private_key_id"
                                  name="gcp_private_key_id"
                                  onChange={(
                                    e: React.ChangeEvent<HTMLInputElement>,
                                  ) =>
                                    setGCPConfiguration({
                                      ...gcpConfiguration,
                                      secretmanager: {
                                        ...gcpConfiguration?.secretmanager,
                                        credentials: {
                                          ...gcpConfiguration?.secretmanager
                                            .credentials,
                                          private_key_id: e.target.value,
                                        },
                                      },
                                    })
                                  }
                                  label="Private Key ID"
                                  tooltip="Is the private key ID of the GCP service account used to access the SecretManager"
                                  value={
                                    gcpConfiguration?.secretmanager.credentials
                                      ?.private_key_id || ""
                                  }
                                />
                                <InputBox
                                  id="gcp_private_key"
                                  name="gcp_private_key"
                                  onChange={(
                                    e: React.ChangeEvent<HTMLInputElement>,
                                  ) =>
                                    setGCPConfiguration({
                                      ...gcpConfiguration,
                                      secretmanager: {
                                        ...gcpConfiguration?.secretmanager,
                                        credentials: {
                                          ...gcpConfiguration?.secretmanager
                                            .credentials,
                                          private_key: e.target.value,
                                        },
                                      },
                                    })
                                  }
                                  label="Private Key"
                                  tooltip="Is the private key of the GCP service account used to access the SecretManager"
                                  value={
                                    gcpConfiguration?.secretmanager.credentials
                                      ?.private_key || ""
                                  }
                                />
                              </fieldset>
                            </Fragment>
                          )}
                          {encryptionType === "aws" && (
                            <Fragment>
                              <InputBox
                                id="aws_endpoint"
                                name="aws_endpoint"
                                onChange={(
                                  e: React.ChangeEvent<HTMLInputElement>,
                                ) =>
                                  setAWSConfiguration({
                                    ...awsConfiguration,
                                    secretsmanager: {
                                      ...awsConfiguration?.secretsmanager,
                                      endpoint: e.target.value,
                                    },
                                  })
                                }
                                label="Endpoint"
                                tooltip="Endpoint is the AWS SecretsManager endpoint. AWS SecretsManager endpoints have the following schema: secrestmanager[-fips].<region>.amanzonaws.com"
                                value={
                                  awsConfiguration?.secretsmanager?.endpoint ||
                                  ""
                                }
                                required
                                error={validationErrors["aws_endpoint"] || ""}
                              />
                              <InputBox
                                id="aws_region"
                                name="aws_region"
                                onChange={(
                                  e: React.ChangeEvent<HTMLInputElement>,
                                ) =>
                                  setAWSConfiguration({
                                    ...awsConfiguration,
                                    secretsmanager: {
                                      ...awsConfiguration?.secretsmanager,
                                      region: e.target.value,
                                    },
                                  })
                                }
                                label="Region"
                                tooltip="Region is the AWS region the SecretsManager is located"
                                value={
                                  awsConfiguration?.secretsmanager?.region || ""
                                }
                                error={validationErrors["aws_region"] || ""}
                                required
                              />
                              <InputBox
                                id="aws_kmsKey"
                                name="aws_kmsKey"
                                onChange={(
                                  e: React.ChangeEvent<HTMLInputElement>,
                                ) =>
                                  setAWSConfiguration({
                                    ...awsConfiguration,
                                    secretsmanager: {
                                      ...awsConfiguration?.secretsmanager,
                                      kmskey: e.target.value,
                                    },
                                  })
                                }
                                label="KMS Key"
                                tooltip="KMSKey is the AWS-KMS key ID (CMK-ID) used to en/decrypt secrets managed by the SecretsManager. If empty, the default AWS KMS key is used"
                                value={
                                  awsConfiguration?.secretsmanager?.kmskey || ""
                                }
                              />
                              <fieldset className={"inputItem"}>
                                <legend>Credentials</legend>
                                <InputBox
                                  id="aws_accessKey"
                                  name="aws_accessKey"
                                  onChange={(
                                    e: React.ChangeEvent<HTMLInputElement>,
                                  ) =>
                                    setAWSConfiguration({
                                      ...awsConfiguration,
                                      secretsmanager: {
                                        ...awsConfiguration?.secretsmanager,
                                        credentials: {
                                          ...awsConfiguration?.secretsmanager
                                            ?.credentials,
                                          accesskey: e.target.value,
                                        },
                                      },
                                    })
                                  }
                                  label="Access Key"
                                  tooltip="AccessKey is the access key for authenticating to AWS"
                                  value={
                                    awsConfiguration?.secretsmanager
                                      ?.credentials?.accesskey || ""
                                  }
                                  error={
                                    validationErrors["aws_accessKey"] || ""
                                  }
                                  required
                                />
                                <InputBox
                                  id="aws_secretKey"
                                  name="aws_secretKey"
                                  onChange={(
                                    e: React.ChangeEvent<HTMLInputElement>,
                                  ) =>
                                    setAWSConfiguration({
                                      ...awsConfiguration,
                                      secretsmanager: {
                                        ...awsConfiguration?.secretsmanager,
                                        credentials: {
                                          ...awsConfiguration?.secretsmanager
                                            ?.credentials,
                                          secretkey: e.target.value,
                                        },
                                      },
                                    })
                                  }
                                  label="Secret Key"
                                  tooltip="SecretKey is the secret key for authenticating to AWS"
                                  value={
                                    awsConfiguration?.secretsmanager
                                      ?.credentials?.secretkey || ""
                                  }
                                  error={
                                    validationErrors["aws_secretKey"] || ""
                                  }
                                  required
                                />
                                <InputBox
                                  id="aws_token"
                                  name="aws_token"
                                  onChange={(
                                    e: React.ChangeEvent<HTMLInputElement>,
                                  ) =>
                                    setAWSConfiguration({
                                      ...awsConfiguration,
                                      secretsmanager: {
                                        ...awsConfiguration?.secretsmanager,
                                        credentials: {
                                          ...awsConfiguration?.secretsmanager
                                            ?.credentials,
                                          token: e.target.value,
                                        },
                                      },
                                    })
                                  }
                                  label="Token"
                                  tooltip="SessionToken is an optional session token for authenticating to AWS when using STS"
                                  value={
                                    awsConfiguration?.secretsmanager
                                      ?.credentials?.token || ""
                                  }
                                />
                              </fieldset>
                            </Fragment>
                          )}
                          {encryptionType === "gemalto" && (
                            <Fragment>
                              <InputBox
                                id="gemalto_endpoint"
                                name="gemalto_endpoint"
                                onChange={(
                                  e: React.ChangeEvent<HTMLInputElement>,
                                ) =>
                                  setGemaltoConfiguration({
                                    ...gemaltoConfiguration,
                                    keysecure: {
                                      ...gemaltoConfiguration?.keysecure,
                                      endpoint: e.target.value,
                                    },
                                  })
                                }
                                label="Endpoint"
                                tooltip="Endpoint is the endpoint to the KeySecure server"
                                value={
                                  gemaltoConfiguration?.keysecure?.endpoint ||
                                  ""
                                }
                                error={
                                  validationErrors["gemalto_endpoint"] || ""
                                }
                                required
                              />
                              <fieldset className={"inputItem"}>
                                <legend>Credentials</legend>
                                <InputBox
                                  id="gemalto_token"
                                  name="gemalto_token"
                                  onChange={(
                                    e: React.ChangeEvent<HTMLInputElement>,
                                  ) =>
                                    setGemaltoConfiguration({
                                      ...gemaltoConfiguration,
                                      keysecure: {
                                        ...gemaltoConfiguration?.keysecure,
                                        credentials: {
                                          ...gemaltoConfiguration?.keysecure
                                            ?.credentials,
                                          token: e.target.value,
                                        },
                                      },
                                    })
                                  }
                                  label="Token"
                                  tooltip="Token is the refresh authentication token to access the KeySecure server"
                                  value={
                                    gemaltoConfiguration?.keysecure?.credentials
                                      ?.token || ""
                                  }
                                  error={
                                    validationErrors["gemalto_token"] || ""
                                  }
                                  required
                                />
                                <InputBox
                                  id="gemalto_domain"
                                  name="gemalto_domain"
                                  onChange={(
                                    e: React.ChangeEvent<HTMLInputElement>,
                                  ) =>
                                    setGemaltoConfiguration({
                                      ...gemaltoConfiguration,
                                      keysecure: {
                                        ...gemaltoConfiguration?.keysecure,
                                        credentials: {
                                          ...gemaltoConfiguration?.keysecure
                                            ?.credentials,
                                          domain: e.target.value,
                                        },
                                      },
                                    })
                                  }
                                  label="Domain"
                                  tooltip="Domain is the isolated namespace within the KeySecure server. If empty, defaults to the top-level / root domain"
                                  value={
                                    gemaltoConfiguration?.keysecure?.credentials
                                      ?.domain || ""
                                  }
                                  error={
                                    validationErrors["gemalto_domain"] || ""
                                  }
                                  required
                                />
                                <InputBox
                                  type="number"
                                  min="0"
                                  id="gemalto_retry"
                                  name="gemalto_retry"
                                  onChange={(
                                    e: React.ChangeEvent<HTMLInputElement>,
                                  ) =>
                                    setGemaltoConfiguration({
                                      ...gemaltoConfiguration,
                                      keysecure: {
                                        ...gemaltoConfiguration?.keysecure,
                                        credentials: {
                                          ...gemaltoConfiguration?.keysecure
                                            ?.credentials,
                                          retry: e.target.value,
                                        },
                                      },
                                    })
                                  }
                                  label="Retry (seconds)"
                                  value={
                                    gemaltoConfiguration?.keysecure?.credentials
                                      ?.retry || ""
                                  }
                                  error={
                                    validationErrors["gemalto_retry"] || ""
                                  }
                                />
                              </fieldset>
                            </Fragment>
                          )}
                        </Fragment>
                      ),
                    },
                    {
                      tabConfig: { label: "Raw Edit", id: "raw-edit" },
                      content: (
                        <CodeEditor
                          value={encryptionRawConfiguration}
                          mode={"yaml"}
                          onChange={(value) => {
                            setEncryptionRawConfiguration(value);
                          }}
                          editorHeight={"550px"}
                        />
                      ),
                    },
                  ]}
                  onTabClick={(value) => setEditRawConfiguration(value)}
                  currentTabOrPath={editRawConfiguration}
                  horizontal
                />
              </Grid>
              <Grid item xs={12}>
                <SectionTitle>Additional Configuration for KES</SectionTitle>
                <InputBox
                  value="enableCustomCertsForKES"
                  id="enableCustomCertsForKES"
                  name="enableCustomCertsForKES"
                  checked={enabledCustomCertificates}
                  onChange={() =>
                    setEnabledCustomCertificates(!enabledCustomCertificates)
                  }
                  label={"Custom Certificates"}
                />
                {enabledCustomCertificates && (
                  <Fragment>
                    <fieldset className={"inputItem"}>
                      <legend>Encryption server certificates</legend>
                      {kesServerTLSCertificateSecret ? (
                        <TLSCertificate
                          certificateInfo={kesServerTLSCertificateSecret}
                          onDelete={() =>
                            removeCertificate(kesServerTLSCertificateSecret)
                          }
                        />
                      ) : (
                        <Fragment>
                          <FileSelector
                            onChange={(event, fileName, encodedValue) => {
                              if (encodedValue) {
                                setKESServerCertificate({
                                  encoded_key: encodedValue,
                                  id: kesServerCertificate?.id || "",
                                  key: fileName || "",
                                  cert: kesServerCertificate?.cert || "",
                                  encoded_cert:
                                    kesServerCertificate?.encoded_cert || "",
                                });
                                cleanValidation("serverKey");
                              }
                            }}
                            accept=".key,.pem"
                            id="serverKey"
                            name="serverKey"
                            label="Key"
                            value={kesServerCertificate?.key || ""}
                            returnEncodedData
                          />
                          <FileSelector
                            onChange={(event, fileName, encodedValue) => {
                              if (encodedValue) {
                                setKESServerCertificate({
                                  encoded_key:
                                    kesServerCertificate?.encoded_key || "",
                                  id: kesServerCertificate?.id || "",
                                  key: kesServerCertificate?.key || "",
                                  cert: fileName || "",
                                  encoded_cert: encodedValue || "",
                                });
                                cleanValidation("serverCert");
                              }
                            }}
                            accept=".cer,.crt,.cert,.pem"
                            id="serverCert"
                            name="serverCert"
                            label="Cert"
                            value={kesServerCertificate?.cert || ""}
                            returnEncodedData
                          />
                        </Fragment>
                      )}
                    </fieldset>
                    <fieldset className={"inputItem"}>
                      <legend>
                        MinIO mTLS certificates (connection between MinIO and
                        the Encryption server)
                      </legend>
                      {minioMTLSCertificateSecret ? (
                        <TLSCertificate
                          certificateInfo={minioMTLSCertificateSecret}
                          onDelete={() =>
                            removeCertificate(minioMTLSCertificateSecret)
                          }
                        />
                      ) : (
                        <Fragment>
                          <FileSelector
                            onChange={(event, fileName, encodedValue) => {
                              if (encodedValue) {
                                setMinioMTLSCertificate({
                                  encoded_key: encodedValue,
                                  id: minioMTLSCertificate?.id || "",
                                  key: fileName || "",
                                  cert: minioMTLSCertificate?.cert || "",
                                  encoded_cert:
                                    minioMTLSCertificate?.encoded_cert || "",
                                });
                                cleanValidation("clientKey");
                              }
                            }}
                            accept=".key,.pem"
                            id="clientKey"
                            name="clientKey"
                            label="Key"
                            value={minioMTLSCertificate?.key || ""}
                            returnEncodedData
                          />
                          <FileSelector
                            onChange={(event, fileName, encodedValue) => {
                              if (encodedValue) {
                                setMinioMTLSCertificate({
                                  encoded_key:
                                    minioMTLSCertificate?.encoded_key || "",
                                  id: minioMTLSCertificate?.id || "",
                                  key: minioMTLSCertificate?.key || "",
                                  cert: fileName || "",
                                  encoded_cert: encodedValue || "",
                                });
                                cleanValidation("clientCert");
                              }
                            }}
                            accept=".cer,.crt,.cert,.pem"
                            id="clientCert"
                            name="clientCert"
                            label="Cert"
                            value={minioMTLSCertificate?.cert || ""}
                            returnEncodedData
                          />
                        </Fragment>
                      )}
                    </fieldset>
                    <fieldset className={"inputItem"}>
                      <legend>
                        KMS mTLS certificates (connection between the Encryption
                        server and the KMS)
                      </legend>
                      {kmsMTLSCertificateSecret ? (
                        <TLSCertificate
                          certificateInfo={kmsMTLSCertificateSecret}
                          onDelete={() =>
                            removeCertificate(kmsMTLSCertificateSecret)
                          }
                        />
                      ) : (
                        <Fragment>
                          <FileSelector
                            onChange={(event, fileName, encodedValue) => {
                              if (encodedValue) {
                                setKmsMTLSCertificate({
                                  encoded_key: encodedValue || "",
                                  id: kmsMTLSCertificate?.id || "",
                                  key: fileName || "",
                                  cert: kmsMTLSCertificate?.cert || "",
                                  encoded_cert:
                                    kmsMTLSCertificate?.encoded_cert || "",
                                });
                              }
                            }}
                            accept=".key,.pem"
                            id="kms_mtls_key"
                            name="kms_mtls_key"
                            label="Key"
                            value={kmsMTLSCertificate?.key || ""}
                            returnEncodedData
                          />
                          <FileSelector
                            onChange={(event, fileName, encodedValue) => {
                              if (encodedValue) {
                                setKmsMTLSCertificate({
                                  encoded_key:
                                    kmsMTLSCertificate?.encoded_key || "",
                                  id: kmsMTLSCertificate?.id || "",
                                  key: kmsMTLSCertificate?.key || "",
                                  cert: fileName || "",
                                  encoded_cert: encodedValue || "",
                                });
                              }
                            }}
                            accept=".cer,.crt,.cert,.pem"
                            id="kms_mtls_cert"
                            name="kms_mtls_cert"
                            label="Cert"
                            value={kmsMTLSCertificate?.cert || ""}
                            returnEncodedData
                          />
                        </Fragment>
                      )}
                      {kmsCACertificateSecret ? (
                        <TLSCertificate
                          certificateInfo={kmsCACertificateSecret}
                          onDelete={() =>
                            removeCertificate(kmsCACertificateSecret)
                          }
                        />
                      ) : (
                        <FileSelector
                          onChange={(event, fileName, encodedValue) => {
                            if (encodedValue) {
                              setKmsCACertificate({
                                encoded_key:
                                  kmsCACertificate?.encoded_key || "",
                                id: kmsCACertificate?.id || "",
                                key: kmsCACertificate?.key || "",
                                cert: fileName || "",
                                encoded_cert: encodedValue || "",
                              });
                            }
                          }}
                          accept=".cer,.crt,.cert,.pem"
                          id="kms_mtls_ca"
                          name="kms_mtls_ca"
                          label="CA"
                          value={kmsCACertificate?.cert || ""}
                          returnEncodedData
                        />
                      )}
                    </fieldset>
                  </Fragment>
                )}
                <InputBox
                  type="text"
                  id="image"
                  name="image"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setImage(e.target.value)
                  }
                  label="Image"
                  tooltip="KES container image"
                  placeholder="minio/kes:2024-03-01T18-06-46Z"
                  value={image}
                />
                <InputBox
                  type="number"
                  min="1"
                  id="replicas"
                  name="replicas"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setReplicas(e.target.value)
                  }
                  label="Replicas"
                  tooltip="Numer of KES pod replicas"
                  value={replicas}
                  required
                  error={validationErrors["replicas"] || ""}
                />
                <SectionTitle>SecurityContext for KES</SectionTitle>
                <Box
                  sx={{
                    display: "flex" as const,
                    alignItems: "center" as const,
                    justifyContent: "flex-start" as const,
                    gap: 15,
                    "@media (max-width: 900px)": {
                      display: "flex",
                      flexFlow: "column",
                    },
                  }}
                >
                  <Box className={`inputItem`}>
                    <InputBox
                      type="number"
                      id="kes_securityContext_runAsUser"
                      name="kes_securityContext_runAsUser"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setSecurityContext({
                          ...securityContext,
                          runAsUser: e.target.value,
                        });
                      }}
                      label="Run As User"
                      value={securityContext.runAsUser}
                      required
                      error={
                        validationErrors["kes_securityContext_runAsUser"] || ""
                      }
                      min="0"
                    />
                  </Box>
                  <Box className={`inputItem`}>
                    <InputBox
                      type="number"
                      id="kes_securityContext_runAsGroup"
                      name="kes_securityContext_runAsGroup"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setSecurityContext({
                          ...securityContext,
                          runAsGroup: e.target.value,
                        });
                      }}
                      label="Run As Group"
                      value={securityContext.runAsGroup}
                      required
                      error={
                        validationErrors["kes_securityContext_runAsGroup"] || ""
                      }
                      min="0"
                    />
                  </Box>
                </Box>
                <Box
                  sx={{
                    display: "flex" as const,
                    alignItems: "center" as const,
                    justifyContent: "flex-start" as const,
                    gap: 15,
                    "@media (max-width: 900px)": {
                      display: "flex",
                      flexFlow: "column",
                    },
                  }}
                >
                  <Box className={`inputItem`}>
                    <InputBox
                      type="number"
                      id="kes_securityContext_fsGroup"
                      name="kes_securityContext_fsGroup"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setSecurityContext({
                          ...securityContext,
                          fsGroup: e.target.value,
                        });
                      }}
                      label="FsGroup"
                      value={securityContext.fsGroup!}
                      required
                      error={
                        validationErrors["kes_securityContext_fsGroup"] || ""
                      }
                      min="0"
                      sx={{
                        marginBottom: 12,
                      }}
                    />
                  </Box>
                </Box>
                <InputBox
                  value="kesSecurityContextRunAsNonRoot"
                  id="kes_securityContext_runAsNonRoot"
                  name="kes_securityContext_runAsNonRoot"
                  checked={securityContext.runAsNonRoot}
                  onChange={(e) => {
                    const targetD = e.target;
                    const checked = targetD.checked;
                    setSecurityContext({
                      ...securityContext,
                      runAsNonRoot: checked,
                    });
                  }}
                  label={"Do not run as Root"}
                />
              </Grid>
            </Fragment>
          )}
          <Grid item xs={12} sx={modalStyleUtils.modalButtonBar}>
            <Button
              id={"save-encryption"}
              type="submit"
              variant="callAction"
              disabled={!isFormValid}
              onClick={() => setConfirmOpen(true)}
              label={"Save"}
            />
          </Grid>
        </Grid>
      </FormLayout>
    </React.Fragment>
  );
};

export default TenantEncryption;
