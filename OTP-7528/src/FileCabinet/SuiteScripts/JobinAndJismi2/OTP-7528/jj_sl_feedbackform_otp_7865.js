/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet 
 * 
 * Client Name: Nil
 * 
 * Jira Code: OTP-7865
 * 
 * Title: External Custom Record Form and Actions
 * 
 * Author: Jobin And Jismi IT Services LLP
 * 
 * Date Created: 2024-09-10
 *
 * Script Description:
 * Creates and manages a custom record with fields for Customer Name, Customer Email, Customer (Reference), Subject, and Message.
 * - Supports external entries (no NetSuite access required).
 * - Links to a customer if the email ID exists.
 * - Sends notifications to a static NetSuite Admin and the customer’s Sales Rep, if applicable.
 * - Checks for duplicate records.
 * 

 * 
 * Revision History: 1.0
 


*/
define(['N/email', 'N/record', 'N/search', 'N/ui/serverWidget','N/runtime'],
    /**
 * @param{email} email
 * @param{record} record
 * @param{search} search
 * @param{serverWidget} serverWidget
 */
    (email, record, search, serverWidget, runtime) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            if (scriptContext.request.method === 'GET') {
                try {
                    let externallyLinkedForm = createExternallyLinkedForm();
                    scriptContext.response.writePage(externallyLinkedForm);
                } catch (err) {
                    scriptContext.response.write("Something Went Wrong");
                    log.error(err);
                }
            }
            else if (scriptContext.request.method === 'POST') 
                {

                try {

                    let customerName = scriptContext.request.parameters.custpage_jj_customer_name_otp7528;
                    let customerEmail = scriptContext.request.parameters.custpage_jj_customer_email_otp7528;
                    let subject = scriptContext.request.parameters.custpage_jj_subject_otp7528;
                    let message = scriptContext.request.parameters.custpage_jj_message_otp7528;
                    if (toCheckDuplicates(customerEmail)) {
                        let customerId = findCustomerRecord(customerEmail);
                        let recordId = createRecordOfFeedback(scriptContext.request.parameters, customerId)
                        let salesRepId = findSalesRep(customerId);

                        sendEmail(getUserId("mfgfun070224rf@netsuite.com"));
                        sendEmail(salesRepId);

                        let html = htmlCreator(customerName, customerEmail, subject, message, customerId, recordId);
                        scriptContext.response.write(html);
                    } else {
                        scriptContext.response.write("The record with the same email id exist!!!");
                    }


                } catch (err) {
                    log.error(err);

                }
            }

        }




        
        /**
            * Creates a customer feedback form using the NetSuite serverWidget module.
            * The form includes fields for customer name, email, subject, and message,
            * along with a submit button.
            *
            * @function createExternallyLinkedForm
            * @returns {serverWidget.Form} The created form object with fields and submit button.
            *
            * @throws {Error} If there is an issue creating the form or adding fields.
        */
        function createExternallyLinkedForm() 
        {
            let form = serverWidget.createForm({
                title: 'Customer Feedback Form'
            });

            let customerName = form.addField({
                id: 'custpage_jj_customer_name_otp7528',
                type: serverWidget.FieldType.TEXT,
                label: 'Customer Name'
            });
            customerName.isMandatory = true;
            let customerEmail = form.addField({
                id: 'custpage_jj_customer_email_otp7528',
                type: serverWidget.FieldType.EMAIL,
                label: 'Customer Email'
            });
            customerEmail.isMandatory = true;
            let subject = form.addField({
                id: 'custpage_jj_subject_otp7528',
                type: serverWidget.FieldType.TEXT,
                label: 'Subject'
            });
            let message = form.addField({
                id: 'custpage_jj_message_otp7528',
                type: serverWidget.FieldType.TEXTAREA,
                label: 'Message'
            });
            form.addSubmitButton({
                label: 'Submit Button'
            });
            
            return form;
        }


        /**
            * Creates a new customer feedback record based on the provided form data and customer ID.
            * The function uses the values from the provided form to populate the feedback record and saves it.
            *
            * @function createRecordOfFeedback
            * @param {Object} scriptContextForm - The form object containing customer feedback data.
            * @param {string} customerId - The internal ID of the customer related to the feedback.
            * @returns {string} The internal ID of the newly created feedback record.
            *
            * @throws {Error} If there is an issue with record creation or saving.
        */
        function createRecordOfFeedback(scriptContextForm, customerId) {
            try {
                let customerName = scriptContextForm.custpage_jj_customer_name_otp7528;
                let customerEmail = scriptContextForm.custpage_jj_customer_email_otp7528;
                let subject = scriptContextForm.custpage_jj_subject_otp7528;
                let message = scriptContextForm.custpage_jj_message_otp7528;
                let feedbackRecord = record.create({
                    type: "customrecord_jj_customer_feedback",
                    isDynamic: true,
                });
                feedbackRecord.setValue({
                    fieldId: "custrecord_jj_customer_email",
                    value: customerEmail
                });
                feedbackRecord.setValue({
                    fieldId: "custrecord_jj_customer_name",
                    value: customerName
                });
                feedbackRecord.setValue({
                    fieldId: "custrecord_jj_email_subject",
                    value: subject
                });

                feedbackRecord.setValue({
                    fieldId: "custrecord_jj_customer_refernce",
                    value: customerId
                });


                feedbackRecord.setValue({
                    fieldId: "custrecord_jj_email_message",
                    value: message
                });

                let recordId = feedbackRecord.save({
                    enableSourcing: false,
                    ignoreMandatoryFields: false
                });

                return recordId;
            }
            catch (err) {
                log.error(err)
            }
        }
        /**
            * Checks for duplicate customer email addresses in a custom feedback form record.
            * The function searches for existing records with the same email address as the provided one.
            *
            * @function toCheckDuplicates
            * @param {string} emailId - The email address to check for duplicates.
            * @returns {boolean} Returns `true` if no duplicates are found, `false` if a duplicate is found.
            *
            * @throws {Error} If there is an issue with the search or logging.
        */
        function toCheckDuplicates(emailId) {
            let FLAG = true;
            try {
                let feedbackFormSearch = search.create({
                    type: search.Type.CUSTOM_RECORD + '_jj_customer_feedback',
                    title: 'My Feedback Form Search',
                    id: 'customsearch_jj_feedbackform_search_2',
                    columns: [{
                        name: 'custrecord_jj_customer_email'
                    }]

                });


                feedbackFormSearch.run().each(function (result) {
                    let existingEmail = result.getValue({
                        name: 'custrecord_jj_customer_email'
                    });

                    if (String(existingEmail) === String(emailId)) {
                        FLAG = false;
                    }
                    return true;
                });
                return FLAG;
            }
            catch (err) {
                log.error("error", err);
                return false;
            }
        }



        /**
            * Finds the internal ID of a customer record based on the provided email address.
            * The function searches for a customer record with an email address that matches the provided one.
            *
            * @function findCustomerRecord
            * @param {string} emailId - The email address to search for in customer records.
            * @returns {string} Returns the internal ID of the customer record if found, otherwise an empty string.
            *
            * @throws {Error} If there is an issue with the search or logging.
        */
        function findCustomerRecord(emailId) {
            let ID = "";
            try {
                let customerSearch = search.create({
                    type: search.Type.CUSTOMER,
                    title: 'My customer Search',
                    id: 'customsearch_jj_customer_search_7528',
                    columns: [{
                        name: 'email'
                    },
                    {
                        name: 'internalid'
                    }]

                });

                customerSearch.run().each(function (result) {
                    let existingEmail = result.getValue({
                        name: 'email'
                    });
                    let internalId = result.getValue({
                        name: 'internalid'
                    });
                    if (String(existingEmail) === String(emailId)) {
                        ID = internalId;
                    }
                    return true;
                });
                return ID;
            }
            catch (err) {
                log.error("Error from findCustomerRecord", err);
            }
        }


        /**
            * Retrieves the internal ID of the sales representative associated with a given customer.
            * The function performs a lookup on the customer record to find the sales representative.
            *
            * @function findSalesRep
            * @param {string} customerId - The internal ID of the customer whose sales representative is to be retrieved.
            * @returns {string} The internal ID of the sales representative if found, otherwise an empty string.
            *
            * @throws {Error} If there is an issue with the lookup operation or logging.
        */

        function findSalesRep(customerId) {
            try {
                let fieldLookUp = search.lookupFields({
                    type: search.Type.CUSTOMER,
                    id: customerId,
                    columns: ['salesrep']
                });
                let employeeLookup = search.lookupFields({
                    type: search.Type.EMPLOYEE,
                    id: fieldLookUp.salesrep[0].value,
                    columns: ['isinactive']
                });
                if (!employeeLookup.isinactive)
                {
                    return fieldLookUp.salesrep[0].value;
                }else{
                    throw "No Sales Rep For The Customer";
                }

            } catch (err) {
                log.error("Error from findsalesrep function", err);
                return "";
            }
        }

        /**
            * Sends an email notification about a record creation to the specified recipients.
            * The email is sent with a predefined subject and body, using the default author.
            *
            * @function sendEmail
            * @param {Array|string} recipientsId - The internal ID(s) of the recipients to receive the email. Can be a single ID or an array of IDs.
            * @throws {Error} If there is an issue with sending the email or logging.
        */

        function sendEmail(recipientsId) {
            try {
                let authorLookup = search.lookupFields({
                    type: search.Type.EMPLOYEE,
                    id: getUserId("kabernathy@netsuite.com"),
                    columns: ['entityid']
                });
                let authorName = authorLookup.entityid;
                let recipientsLookup = search.lookupFields({
                    type: search.Type.EMPLOYEE,
                    id:  recipientsId,
                    columns: ['entityid']
                });
                let recipientsName = recipientsLookup.entityid;
                email.send({
                    author: getUserId("kabernathy@netsuite.com"),
                    recipients: recipientsId,
                    subject: "Customer Feedback Record Created",
                    body: `Dear ${recipientsName},

                    I hope this email finds you well. I would like to inform you that a new customer feedback record has been created in our system.

                    Please let me know if any further action is required on this.

                    Best regards,
                    ${authorName}`,
                });
            } catch (err) {
                log.error("Error on sending mail", err);
            }
        }

        /**
            * Creates an HTML string containing customer details and feedback information.
            * If an error occurs during HTML generation, an error message HTML string is returned.
            *
            * @function htmlCreator
            * @param {string} customerName - The name of the customer.
            * @param {string} customerEmail - The email address of the customer.
            * @param {string} subject - The subject of the feedback.
            * @param {string} message - The content of the feedback message.
            * @param {string} customerId - The internal ID of the customer.
            * @param {string} recordId - The internal ID of the feedback record.
            * @returns {string} The HTML string with customer details and feedback, or an error message.
            *
            * @throws {Error} If there is an issue generating the HTML string.
        */
        function htmlCreator(customerName, customerEmail, subject, message, customerId, recordId) {
            try {
                let html = `<!DOCTYPE html>
                                <html lang="en">
                                    <head>
                                        <meta charset="UTF-8">
                                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                        <title>Customer Details                    </title>
                                        <style>
                                        body {
                                            font-family: Arial, sans-serif;
                                            background-color: #f4f4f4;
                                            margin: 0;
                                            padding: 20px;
                                        }
                                        .container {
                                            max-width: 800px;
                                            margin: auto;
                                            background: #fff;
                                            padding: 20px;
                                            border-radius: 8px;
                                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                        }
                                        h1 {
                                            color: #333;
                                            margin-bottom: 20px;
                                        }
                                        .details {
                                            margin-bottom: 20px;
                                        }
                                        .details label {
                                            font-weight: bold;
                                            color: #555;
                                        }
                                        .details p {
                                            margin: 5px 0 10px;
                                            color: #333;
                                        }
                                        .message {
                                        border: 1px solid #ddd;
                                        border-radius: 4px;
                                        padding: 10px;
                                        background-color: #fafafa;
                                        }
                                    </style>
                                    </head>
                                    <body>
                                        <div class="container">
                                            <h1>Customer Details</h1>
                                            <div class="details">
                                                <label for="customerName">Customer Id:</label>
                                                <p id="customerName">${customerId} </p>
                                            </div>
                                            <div class="details">
                                                <label for="customerName">Record Id:</label>
                                                <p id="customerName">${recordId}</p>
                                            </div>
                                            <div class="details">
                                                <label for="customerName">Customer Name:</label>
                                                <p id="customerName">${customerName}</p>
                                            </div>
                                            <div class="details">
                                                <label for="customerEmail">Customer Email:</label>
                                                <p id="customerEmail">${customerEmail}</p>
                                            </div>
                                            <div class="details">
                                                <label for="subject">Subject:</label>
                                                <p id="subject">${subject}</p>
                                            </div>
                                            <div class="details">
                                                <label for="message">Message:</label>
                                                <div id="message" class="message">${message}</div>
                                            </div>
                                        </div>
                                    </body>
                                </html>`

                return html;
            } catch {
                let html = `                    
                <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Error                    </title>
                        <style>
                            .error-message {
                                color: red;
                                font-size: 24px;
                                text-align: center;
                                margin-top: 50px;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="error-message">
                            Something went wrong!
                        </div>
                    </body>
                    </html>
                `
                return html;
            }
        }


        /**
            * Retrieves the internal ID of an employee based on their email.
            * 
            * This function performs a search on the "employee" record type to find the employee
            * with the specified email. The search filters out inactive employees and returns
            * the internal ID of the matching employee.
            * 
            * @param {string} email - The email of the employee to search for.
            * @returns {number} The internal ID of the employee, or 0 if no matching employee is found.
        */

        function getUserId(email){
            let internalId = 0;
            let adminSearch = search.create({
                type: "employee",
                filters:
                [
                   ["email","is",email], 
                   "AND", 
                   ["isinactive","is","F"]
                ],
                columns:
                [
                   search.createColumn({name: "internalid", label: "Internal ID",sort: search.Sort.ASC})
                ]
             });

             adminSearch.run().each(function (result) {
                internalId = result.getValue({
                    name: "internalid"
                })
             });
             return internalId;
        }
        return { onRequest }

    });
