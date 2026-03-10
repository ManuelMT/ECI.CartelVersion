// UsePosterVersion
const CONSTANTS = {
    ROLES: {
        USUARIO_TIENDA_CARTEL: "ECI - Tienda Cartel",
        USUARIO_MARKETING_CARTEL: "ECI - Marketing Cartel",
        USUARIO_PRODUCCION_CARTEL: "ECI - Producción Cartel"
    },
    ESTADO_CARTEL: {
        CARTEL_NUEVO: 1,
        CARTEL_CORREGIDO: 2,
        ERROR_REPORTADO: 3,
        CARTEL_EN_CORRECCION: 4,
        CARTEL_CORRECTO: 5,
        CARTEL_PROPUESTA: 7,
        CARTEL_EN_PROCESO: 8,
        CARTEL_A_REDISENIAR: 10
    },
    IDIOMA: {
        CASTELLANO: 'ES',
        PORTUGUES: 'PT'
    },
    FASES: {
        REGISTRAR_CARTEL: "5df51fd3-2fee-4621-befa-4bf4e7426baf",
        APROBAR_CARTEL_PROPUESTA: "003b0bc7-34f1-467f-88df-80cd6793e3d2",
        VALIDACION_ESTADO: "1dd1daca-f692-4152-9b2e-e75b49d37562",
        APROBAR_ERROR_REPORTADO: "9496fad7-1596-4a78-b485-a2223ee4d061",
        FINALIZADO: "02437382-7a71-4522-8ec1-53525323c5e9",
    }
}
var hide = true;
var interval = null;

var firstTime = true;

var pages_with_errors_modified = false;

var UsePosterVersion = window.UsePosterVersion || {};
(function () {
    "use strict";
    this.formOnLoad = function (executionContext) {
        var formContext = executionContext.getFormContext();
        this.actionMethods.validUploadPoster(executionContext);
        this.genericMethods.hideBackButton(executionContext);
        const entityId = formContext.data.entity.getId()?.replaceAll("{", "")?.replaceAll("}", "");
        if ((!!firstTime && !entityId) || (!!firstTime && !!entityId)) {
            // formContext.getAttribute("eci_pages_with_errors").addOnChange(this.actionMethods.pagesWithErrosOnChange);
            // formContext.data.entity.addOnPostSave(this.actionMethods.validNextState);
            const file = formContext.getAttribute("eci_poster_file_temp").getValue();
            if (!file) {
                formContext.getAttribute("eci_poster_file_temp").addOnChange(this.actionMethods.fileOnChange);
            }

            firstTime = false;
        }

    };
    this.actionMethods = {
        validUploadPoster: async (executionContext) => {
            var formContext = executionContext.getFormContext();
            var globalContext = Xrm.Utility.getGlobalContext();
            var urlBase = globalContext.getClientUrl();
            const versionName = formContext.getAttribute("eci_name").getValue();
            const entityId = formContext.data.entity.getId()?.replaceAll("{", "")?.replaceAll("}", "");
            const cartelLookUp = formContext.getAttribute("eci_poster").getValue();
            const posterFile = formContext.getAttribute("eci_poster_file_temp").getValue();
            const posterFileOriginal = formContext.getAttribute("eci_poster_file").getValue();
            const posterWithError = formContext.getAttribute("eci_poster_with_error").getValue();
            const [cartelLk] = !!cartelLookUp ? cartelLookUp : [];
            const cartelId = cartelLk?.id?.replaceAll("{", "")?.replaceAll("}", "");
            const [currentVersion] = await this.serviceMehods.getCartelVersiones(cartelId);
            const cartel = await this.serviceMehods.getCartelById(cartelId);
            const validProduccion = this.genericMethods.validRolProduccion();
            const validTienda = this.genericMethods.validRolTienda();
            const validMarketing = this.genericMethods.validRolMarketing();
            if ((cartel?.eci_poster_status === CONSTANTS.ESTADO_CARTEL.CARTEL_NUEVO ||
                cartel?.eci_poster_status === CONSTANTS.ESTADO_CARTEL.CARTEL_EN_CORRECCION ||
                cartel?.eci_poster_status === CONSTANTS.ESTADO_CARTEL.CARTEL_EN_PROCESO ||
                cartel?.eci_poster_status === CONSTANTS.ESTADO_CARTEL.CARTEL_A_REDISENIAR) &&
                !!validProduccion &&
                versionName === currentVersion?.eci_name &&
                !posterFile
            )
                formContext.getControl("eci_poster_file_temp").setDisabled(false);
            else
                formContext.getControl("eci_poster_file_temp").setDisabled(true);

            if (cartel?.eci_poster_status === CONSTANTS.ESTADO_CARTEL.CARTEL_EN_CORRECCION) {
                formContext.getControl("eci_pages_with_errors")?.setDisabled(true);
                if (!!posterFile) {
                    formContext.getControl("eci_marketing_comment")?.setVisible(true);
                }
            }
            if (cartel?.eci_poster_status === CONSTANTS.ESTADO_CARTEL.ERROR_REPORTADO ||
                versionName !== currentVersion?.eci_name) {
                this.genericMethods.disableAllFields(executionContext);
            }

            if (!!posterWithError) formContext.getAttribute("eci_pages_with_errors").setRequiredLevel("required");

            // if (
            //     (
            //         ([
            //             CONSTANTS.ESTADO_CARTEL.CARTEL_NUEVO,
            //             CONSTANTS.ESTADO_CARTEL.CARTEL_CORRECTO,
            //             CONSTANTS.ESTADO_CARTEL.CARTEL_CORREGIDO
            //         ].includes(cartel?.eci_poster_status) &&
            //             !!posterWithError &&
            //             (!!validTienda || !!validMarketing)) ||
            //         ([
            //             CONSTANTS.ESTADO_CARTEL.CARTEL_EN_CORRECCION,
            //             CONSTANTS.ESTADO_CARTEL.ERROR_REPORTADO
            //         ].includes(cartel?.eci_poster_status))
            //     ) &&
            //     versionName === currentVersion?.eci_name &&
            //     !!posterFile
            // ) {
            //     formContext.getControl("eci_notes_json").setDisabled(false);
            // }

            // if (cartel?.eci_poster_status === CONSTANTS.ESTADO_CARTEL.ERROR_REPORTADO ||
            //     versionName !== currentVersion?.eci_name) {
            //     this.genericMethods.disableAllFields(executionContext);
            // }

            if (!!posterFile && !posterFileOriginal) {
                const resDelete = await fetch(`${urlBase}/api/data/v9.0/eci_poster_versions(${entityId})/eci_poster_file_temp`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                var alertStringsError = { confirmButtonLabel: "Aceptar", text: `Se ha encontrado una inconsistencia en el archivo cargado, se procederá a eliminarlo.`, title: "Error" };
                await Xrm.Navigation.openAlertDialog(alertStringsError);
                Xrm.Utility.openEntityForm(formContext.data.entity.getEntityName(), formContext.data.entity.getId());
            }

        },
        fileOnChange: async (executionContext) => {
            Xrm.Utility.showProgressIndicator("Cargando...");
            // Obtiene el contexto del formulario
            var formContext = executionContext.getFormContext();
            var globalContext = Xrm.Utility.getGlobalContext();
            var urlBase = globalContext.getClientUrl();
            const entityId = formContext.data.entity.getId()?.replaceAll("{", "")?.replaceAll("}", "");
            //Conversión de Url Download a Base64
            const convertUrlToBase64 = this.genericMethods.convertUrlToBase64;
            //Conversión Base64 a Bytes
            const convertBase64toBytes = this.genericMethods.convertBase64ToBytes;
            const serviceMethods = this.serviceMehods;
            const genericMethods = this.genericMethods;
            const actionMethods = this.actionMethods;
            setTimeout(async function () {
                let messages = [];
                const file = formContext.getAttribute("eci_poster_file_temp").getValue();
                const versionName = formContext.getAttribute("eci_name").getValue();
                if (!!file) {
                    var name = decodeURIComponent(file?.fileName || '');
                    const [fileNameWithOutExtension] = name?.split('.pdf');
                    const cartelLookUp = formContext.getAttribute("eci_poster").getValue();
                    const [cartelLk] = !!cartelLookUp ? cartelLookUp : [];
                    const cartelId = cartelLk?.id?.replaceAll("{", "")?.replaceAll("}", "");
                    const cartel = await serviceMethods.getCartelById(cartelId);
                    const versionsDuplicated = await serviceMethods.getCartelVersionesDuplicated(cartelId, versionName, entityId)
                    let cartelOriginal = [];

                    await Promise.all(versionsDuplicated?.map(async (x) => {
                        if (!!x?.eci_poster_versionid) {
                            await serviceMethods.deleteCartelVersion(x?.eci_poster_versionid)
                        }
                    }))

                    const validFile = async () => {
                        let valido = true;
                        if (genericMethods.charactersNotAllowed(name)) {
                            messages.push(`Documento '${name}': contiene en su nombre caracteres no válidos como \\/*?|!\"#$%&:;<=>?@'.`);
                            valido = false;
                        }
                        if (!genericMethods.pdfExtension(name)) {
                            messages.push(`Documento '${name}': no es un documento PDF. Solo se pueden cargar documentos PDF.`);
                            valido = false;
                        }
                        if (!genericMethods.wellFormatName(name)) {
                            messages.push(`Documento '${name}': no tiene el formato de nombre correcto.`);
                            valido = false;
                        }

                        //Si aun es válido el nombre del archivo
                        if (!!valido) {
                            const nameSplit = name.split("_");
                            const companyCode = nameSplit[1];
                            const formatName = nameSplit[2];
                            const languageCode = nameSplit[3];
                            const divisionCode = nameSplit[4]?.split('.')[0];
                            // const unecoCodeDoc = nameSplit[5]?.split('.')[0];

                            if (cartel?.eci_company?.eci_company_code_number !== companyCode) {
                                messages.push(`Documento '${name}': el código de la empresa del nombre del archivo no es el mismo del formulario del cartel.`);
                                valido = false;
                            }

                            if (cartel?.eci_format?.eci_format_name !== formatName) {
                                messages.push(`Documento '${name}': el formato del nombre del archivo no es el mismo del formulario del cartel.`);
                                valido = false;
                            }

                            if (cartel?.eci_language?.eci_language_code !== languageCode) {
                                messages.push(`Documento '${name}': el código del idioma del nombre del archivo no es el mismo del formulario del cartel.`);
                                valido = false;
                            }

                            const [divisionCodePoster] = cartel?.eci_division_company?.eci_division_company_name?.split(' - ');
                            if (divisionCodePoster !== divisionCode) {
                                messages.push(`Documento '${name}': el código de la división del nombre del archivo no es el mismo del formulario del cartel.`);
                                valido = false;
                            }

                            // const [unecoCodePoster] = cartel?.eci_poster_uneco?.eci_uneco_name?.split(' - ') || [];
                            // if (!unecoCodeDoc && unecoCodePoster) {
                            //     messages.push(`Documento '${name}': el campo uneco debe estar vacío porque el documento no tiene código de uneco.`);
                            //     valido = false;
                            // } else if (unecoCodeDoc && unecoCodePoster !== unecoCodeDoc) {
                            //     messages.push(`Documento '${name}': el código de la uneco del nombre del archivo no es el mismo del formulario del cartel.`);
                            //     valido = false;
                            // }

                            //Si aun es válido el nombre del archivo
                            if (!!valido) {
                                if (versionName === "V1") {
                                    if (languageCode !== CONSTANTS.IDIOMA.CASTELLANO && languageCode !== CONSTANTS.IDIOMA.PORTUGUES) {
                                        const fileNameSpanish = name?.replace(`_${languageCode}_`, `_${CONSTANTS.IDIOMA.CASTELLANO}_`);
                                        const cartelsByFileNameSpanish = await serviceMethods.getCartelsByNameSpanish(fileNameSpanish);
                                        if (!cartelsByFileNameSpanish?.length) {
                                            messages.push(`Documento '${name}': no existe un cartel con el mismo nombre y con el idioma castellano para la asignación del cartel a traducir`);
                                            valido = false;
                                        }
                                        else {
                                            //Obtener el cartel original para la asignación de cartel traducido
                                            cartelOriginal = [...cartelsByFileNameSpanish];
                                        }

                                    }
                                }
                                else {
                                    const [fileNameShort] = name?.split('_');
                                    const [posterName] = cartel?.eci_poster_name?.split('_');
                                    if (posterName !== fileNameShort) {
                                        messages.push(`Documento '${name}': el nombre del archivo debe ser igual al nombre del cartel, intente modificar el nombre del archivo.`);
                                        valido = false;
                                    }
                                }
                            }

                        }

                        return valido;
                    }


                    const validoArchivo = await validFile();

                    await new Promise(r => setTimeout(r, 1500));
                    if (!validoArchivo) {
                        const resDelete = await fetch(`${urlBase}/api/data/v9.0/eci_poster_versions(${entityId})/eci_poster_file_temp`, {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        });
                        var alertStrings = { confirmButtonLabel: "Aceptar", text: messages.join('\n\n'), title: "Información" };
                        await Xrm.Navigation.openAlertDialog(alertStrings);
                    }
                    else {
                        const myBase64 = await convertUrlToBase64(file?.fileUrl);
                        const arrBase64 = myBase64.split("base64,");
                        const fileBase64 = arrBase64?.length > 1 ? arrBase64[1] : arrBase64[0];
                        const filteBytes = convertBase64toBytes(fileBase64);

                        if (cartel?.eci_language?.eci_language_code !== CONSTANTS.IDIOMA.CASTELLANO && cartel?.eci_language?.eci_language_code !== CONSTANTS.IDIOMA.PORTUGUES && versionName === "V1") {
                            //LOGICA PARA REGISTRAR EL CARTEL TRADUCIDO
                            const batchRequestPosterTranslated = await Promise.all((cartelOriginal || []).map(async (x) => {
                                const payloadCartelTrad = {
                                    "eci_poster_origin@odata.bind": "/eci_posters(" + x?.eci_posterid + ")",
                                    "eci_poster_translated@odata.bind": "/eci_posters(" + cartelId + ")"
                                }
                                // Update a Request
                                var request = new Object();
                                request.getMetadata = function () {
                                    return {
                                        boundParameter: undefined,
                                        operationType: 2,
                                        operationName: "Create" // Operation
                                    };
                                };
                                request.etn = "eci_poster_translated";
                                request.payload = payloadCartelTrad;

                                return request;
                            }));
                            await serviceMethods.batchMultiple(batchRequestPosterTranslated);
                        }

                        await fetch(`${urlBase}/api/data/v9.0/eci_poster_versions(${entityId})/eci_poster_file?x-ms-file-name=${file?.fileName}`, {
                            method: 'PATCH',
                            headers: {
                                'Content-Type': 'application/octet-stream'
                            },
                            body: filteBytes
                        });
                        formContext.getAttribute("eci_poster_file_temp").removeOnChange(actionMethods.fileOnChange);
                        formContext.getAttribute("eci_file_name").setValue(fileNameWithOutExtension);
                        formContext.data.save();
                        await actionMethods.changeNextState(executionContext);
                        var alertStrings = { confirmButtonLabel: "Aceptar", text: `El documento '${name}' se subió correctamente.`, title: "Información" };
                        await Xrm.Navigation.openAlertDialog(alertStrings);
                    }
                    Xrm.Utility.openEntityForm("eci_poster", cartelId);
                }
                Xrm.Utility.closeProgressIndicator();
            }, 1000);
        },
        pagesWithErrosOnChange: (executionContext) => {
            pages_with_errors_modified = true;
        },
        validNextState: async (executionContext) => {
            if (pages_with_errors_modified) {
                Xrm.Utility.showProgressIndicator("Cargando...");
                await this.actionMethods.changeNextState(executionContext);
                pages_with_errors_modified = false;
                Xrm.Utility.closeProgressIndicator();
            }
        },
        changeNextState: async (executionContext) => {
            try {
                var formContext = executionContext.getFormContext();

                const cartelLookUp = formContext.getAttribute("eci_poster").getValue();
                const [cartelLk] = cartelLookUp || [];
                const cartelId = cartelLk?.id?.replaceAll("{", "")?.replaceAll("}", "");
                const cartel = await this.serviceMehods.getCartelById(cartelId);
                const userId = Xrm.Utility.getGlobalContext().userSettings.userId?.replaceAll("{", "")?.replaceAll("}", "");

                const entityId = formContext.data.entity.getId()?.replaceAll("{", "")?.replaceAll("}", "");
                const file = formContext.getAttribute("eci_poster_file_temp").getValue();
                const posterWithError = formContext.getAttribute("eci_poster_with_error").getValue();
                const pagesWithErrors = formContext.getAttribute("eci_pages_with_errors").getValue();


                const setNextState = {
                    [CONSTANTS.ESTADO_CARTEL.CARTEL_NUEVO]: () => !!posterWithError ? ([CONSTANTS.IDIOMA.CASTELLANO, CONSTANTS.IDIOMA.PORTUGUES].includes(cartel?.eci_language?.eci_language_code) ? CONSTANTS.ESTADO_CARTEL.ERROR_REPORTADO : CONSTANTS.ESTADO_CARTEL.CARTEL_EN_CORRECCION) : 0,
                    [CONSTANTS.ESTADO_CARTEL.CARTEL_CORREGIDO]: () => !!posterWithError ? ([CONSTANTS.IDIOMA.CASTELLANO, CONSTANTS.IDIOMA.PORTUGUES].includes(cartel?.eci_language?.eci_language_code) ? CONSTANTS.ESTADO_CARTEL.ERROR_REPORTADO : CONSTANTS.ESTADO_CARTEL.CARTEL_EN_CORRECCION) : 0,
                    [CONSTANTS.ESTADO_CARTEL.CARTEL_CORRECTO]: () => !!posterWithError ? ([CONSTANTS.IDIOMA.CASTELLANO, CONSTANTS.IDIOMA.PORTUGUES].includes(cartel?.eci_language?.eci_language_code) ? CONSTANTS.ESTADO_CARTEL.ERROR_REPORTADO : CONSTANTS.ESTADO_CARTEL.CARTEL_EN_CORRECCION) : 0,
                    [CONSTANTS.ESTADO_CARTEL.CARTEL_EN_CORRECCION]: () => CONSTANTS.ESTADO_CARTEL.CARTEL_CORREGIDO,
                    [CONSTANTS.ESTADO_CARTEL.CARTEL_A_REDISENIAR]: () => CONSTANTS.ESTADO_CARTEL.CARTEL_PROPUESTA,
                    [CONSTANTS.ESTADO_CARTEL.CARTEL_EN_PROCESO]: () => CONSTANTS.ESTADO_CARTEL.CARTEL_PROPUESTA
                }

                const nextState = setNextState[cartel?.eci_poster_status]() || 0;

                const [fileNameWithOutExtension] = file?.fileName?.split(".pdf");
                const posterName = cartel?.eci_poster_name || fileNameWithOutExtension;
                const [bpfCartel] = cartel?.bpf_eci_poster_eci_bpf_poster || [];

                if ((nextState > 0 || (nextState === 0 && [CONSTANTS.ESTADO_CARTEL.CARTEL_NUEVO].includes(cartel?.eci_poster_status))) && !!posterName) {
                    const payload = {
                        ...(nextState === CONSTANTS.ESTADO_CARTEL.CARTEL_PROPUESTA && { eci_poster_proposal_correct: null, "ownerid@odata.bind": `/systemusers(${userId})` }),
                        ...(nextState === CONSTANTS.ESTADO_CARTEL.ERROR_REPORTADO && { eci_valid_reported_error: null, eci_marketing_comment: null, eci_bug_date: new Date(), eci_pages_with_errors: pagesWithErrors }),
                        ...(nextState > 0 && { eci_poster_status: nextState }),
                        ...(nextState === CONSTANTS.ESTADO_CARTEL.CARTEL_CORREGIDO && { eci_correction_date: new Date(), "ownerid@odata.bind": `/systemusers(${userId})` }),
                        ...(nextState === CONSTANTS.ESTADO_CARTEL.CARTEL_EN_CORRECCION && { "eci_poster_origin_translated@odata.bind": null }),
                        eci_poster_name: posterName,
                    };
                    await this.serviceMehods.updateCartel(cartelId, payload);

                    const bpfNexState = {
                        [CONSTANTS.ESTADO_CARTEL.ERROR_REPORTADO]: async () => {
                            const payloadBpfError = {
                                "activestageid@odata.bind": "/processstages(" + CONSTANTS.FASES.APROBAR_ERROR_REPORTADO + ")"
                            };

                            await this.serviceMehods.updateBpfCartel(bpfCartel?.businessprocessflowinstanceid, payloadBpfError);

                        },
                        [CONSTANTS.ESTADO_CARTEL.CARTEL_PROPUESTA]: async () => {
                            const payloadBpfPropuesta = {
                                "activestageid@odata.bind": "processstages(" + CONSTANTS.FASES.APROBAR_CARTEL_PROPUESTA + ")"
                            };

                            await this.serviceMehods.updateBpfCartel(bpfCartel?.businessprocessflowinstanceid, payloadBpfPropuesta);

                        },
                        [CONSTANTS.ESTADO_CARTEL.CARTEL_EN_CORRECCION]: async () => {

                        }
                    }
                    if (!!bpfNexState[nextState])
                        await bpfNexState[nextState]();
                }
            } catch (error) {
                var alertStringsError = { confirmButtonLabel: "Aceptar", text: `Ocurrió un error inesperado, por favor contacte con su administrador.\n Detalle del error: ${error?.message}`, title: "Error" };
                await Xrm.Navigation.openAlertDialog(alertStringsError);
            }

        }
    }
    this.genericMethods = {
        validRolMarketing: () => {
            // Obtiene los roles del usuario actual
            const userId = Xrm.Utility.getGlobalContext().userSettings.userId?.replaceAll("{", "")?.replaceAll("}", "");
            const roles = Xrm.Utility.getGlobalContext().userSettings.roles;
            let allow = false;
            roles.forEach(function (item) {
                if (item.name === CONSTANTS.ROLES.USUARIO_MARKETING_CARTEL) {
                    allow = true;
                }
            });
            return allow
        },
        validRolProduccion: () => {
            // Obtiene los roles del usuario actual
            const userId = Xrm.Utility.getGlobalContext().userSettings.userId?.replaceAll("{", "")?.replaceAll("}", "");
            const roles = Xrm.Utility.getGlobalContext().userSettings.roles;
            let allow = false;
            roles.forEach(function (item) {
                if (item.name === CONSTANTS.ROLES.USUARIO_PRODUCCION_CARTEL) {
                    allow = true;
                }
            });
            return allow
        },
        validRolTienda: () => {
            // Obtiene los roles del usuario actual
            const userId = Xrm.Utility.getGlobalContext().userSettings.userId?.replaceAll("{", "")?.replaceAll("}", "");
            const roles = Xrm.Utility.getGlobalContext().userSettings.roles;
            let allow = false;
            roles.forEach(function (item) {
                if (item.name === CONSTANTS.ROLES.USUARIO_TIENDA_CARTEL) {
                    allow = true;
                }
            });
            return allow
        },
        disableAllFields: (executionContext) => {
            var formContext = executionContext.getFormContext();
            formContext.ui.controls.forEach(function (control, i) {
                if (control && control.getDisabled && !control.getDisabled()) {
                    control.setDisabled(true);
                }
            });
        },
        hideBackButton: () => {
            interval = setInterval(function () {
                var element = parent.document.getElementById("navigateBackButtontab-id-0");
                if (element != null && hide == true) {
                    hide = false;
                    element.style.display = "none";
                    clearInterval(interval);
                }
            }, 1000);
        },
        convertUrlToBase64: async (url) => {
            const data = await fetch(url);
            const blob = await data.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = function () {
                    const base64data = reader.result;
                    resolve(base64data);
                }
            })
        },
        convertBase64ToBytes: (base64String) => {
            const binaryString = atob(base64String);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes.buffer;
        },
        charactersNotAllowed: (name) => {
            var pattern = /[\/*?|!"#$%&:;<=>?@']{1,}/;
            var result = false;
            if (pattern.test(name) === true) result = true;
            return result;
        },
        wellFormatName: (name) => {
            var pattern = /[_]\d{3}[_]\S.*[_]\w{2,4}\d{3}([_]\d{4})?[.]/i;
            var result = true;
            if (pattern.test(name) === false) result = false;
            return result;
        },
        pdfExtension: (name) => {
            var pattern = /[.]pdf/i;
            var result = true;
            if (pattern.test(name) === false) result = false;
            return result;
        }
    }
    this.serviceMehods = {
        getCartelVersiones: async (cartelId) => {
            var select = `*`;
            var filter = `_eci_poster_value eq '${cartelId}'`;
            var query = "?$select=" + select + "&$filter=" + filter + "&$orderby=createdon desc";
            var response = await Xrm.WebApi.retrieveMultipleRecords("eci_poster_version", query);
            return response?.entities || [];
        },
        getCartelVersionesDuplicated: async (cartelId, versionName, versionId) => {
            var select = `*`;
            var filter = `_eci_poster_value eq '${cartelId}' and eci_name eq '${versionName}' and eci_poster_versionid ne '${versionId}'`;
            var query = "?$select=" + select + "&$filter=" + filter + "&$orderby=createdon desc";
            var response = await Xrm.WebApi.retrieveMultipleRecords("eci_poster_version", query);
            return response?.entities || [];
        },
        getCartelById: async (cartelId) => {
            var select = `eci_poster_status,eci_poster_name`;
            var expand = `eci_format($select=eci_format_name),eci_company($select=eci_company_code_number),eci_language($select=eci_language_code),eci_division_company($select=eci_division_company_name),eci_poster_uneco($select=eci_uneco_name),bpf_eci_poster_eci_bpf_poster($select=*),eci_poster_origin_to_poster_translated($select=*)`;
            var query = "?$select=" + select + "&$expand=" + expand;
            var response = await Xrm.WebApi.retrieveRecord("eci_poster", cartelId, query);
            return response;
        },
        getCartelsByName: async (filename, cartelId) => {
            const [fileNameWithOutExtension] = filename?.split('.')
            var select = `*`;
            var filter = `eci_poster_name eq '${fileNameWithOutExtension}' and eci_posterid ne '${cartelId}'`;
            var query = "?$select=" + select + "&$filter=" + filter + "&$orderby=createdon desc";
            var response = await Xrm.WebApi.retrieveMultipleRecords("eci_poster", query);
            return response?.entities || [];
        },
        getCartelsByNameSpanish: async (filename) => {
            const [fileNameWithOutExtension] = filename?.split('.')
            var select = `*`;
            var filter = `eci_poster_name eq '${fileNameWithOutExtension}' and eci_language/eci_language_code eq '${CONSTANTS.IDIOMA.CASTELLANO}'`;
            var expand = `eci_language($select=eci_language_code)`;
            var query = "?$select=" + select + "&$filter=" + filter + "&$expand=" + expand + "&$orderby=createdon desc";
            var response = await Xrm.WebApi.retrieveMultipleRecords("eci_poster", query);
            return response?.entities || [];
        },
        getRolesByUser: async (userId) => {
            var select = `*`;
            var expand = `systemuserroles_association($select=name,_parentrootroleid_value)`;
            var query = "?$select=" + select + "&$expand=" + expand;
            var response = await Xrm.WebApi.retrieveRecord("systemuser", userId, query);
            return response?.systemuserroles_association || [];
        },
        createCartelTraducido: async (cartelTraducido) => {
            var response = await Xrm.WebApi.createRecord("eci_poster_translated", cartelTraducido);
            return response;
        },
        updateCartel: async (cartelId, cartel) => {
            var response = await Xrm.WebApi.updateRecord("eci_poster", cartelId, cartel);
            return response;
        },
        updateBpfCartel: async (bpfCartelId, bpfCartel) => {
            var response = await Xrm.WebApi.updateRecord("eci_bpf_poster", bpfCartelId, bpfCartel);
            return response;
        },
        batchMultiple: async (batchRequest) => {
            var response = await Xrm.WebApi.executeMultiple(batchRequest).then(
                function (results) {
                },
                function (error) {
                });
            return response;
        },
        deleteCartelVersion: async (versionId) => {
            var response = await Xrm.WebApi.deleteRecord("eci_poster_version", versionId);
            return response;
        },
    };
}).call(UsePosterVersion);