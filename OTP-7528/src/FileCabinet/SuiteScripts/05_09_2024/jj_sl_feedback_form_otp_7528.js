/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/email', 'N/record', 'N/search', 'N/ui/serverWidget'],
    /**
 * @param{email} email
 * @param{record} record
 * @param{search} search
 * @param{serverWidget} serverWidget
 */
    (email, record, search, serverWidget) => {
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
                    log.error(err);
                }
            }
            else if (scriptContext.request.method === 'POST') {
                try {

                    let customerName = scriptContext.request.parameters.custpage_jj_customer_name_otp7528;
                    let customerEmail = scriptContext.request.parameters.custpage_jj_customer_email_otp7528;
                    let subject = scriptContext.request.parameters.custpage_jj_subject_otp7528;
                    let message = scriptContext.request.parameters.custpage_jj_message_otp7528;
                    if(toCheckDuplicates(customerEmail))
                    {
                        let customerId = findCustomerRecord(customerEmail);
                        let recordId = createRecordOfFeedback(scriptContext.request.parameters,customerId)
                        let salesRepId = findSalesRep(customerId);

                        
                        sendEmail(1852);
                        sendEmail(salesRepId);

                    let html = htmlCreator(customerName,customerEmail,subject,message,customerId,recordId);
                    scriptContext.response.write(html);
                    }else{
                        scriptContext.response.write("The record with the same email id exist!!!");
                    }
                    

                } catch (err) {
                    log.error(err);

                }
            }

        }

        function createExternallyLinkedForm() {
            var form = serverWidget.createForm({
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
        function createRecordOfFeedback(scriptContextForm,customerId)
        {try{
            let customerName =scriptContextForm.custpage_jj_customer_name_otp7528;
            let customerEmail = scriptContextForm.custpage_jj_customer_email_otp7528;
            let subject = scriptContextForm.custpage_jj_subject_otp7528;
            let message = scriptContextForm.custpage_jj_message_otp7528;
            var feedbackRecord = record.create({
                type: "customrecord_jj_customer_feedback", 
                isDynamic: true,
            });
            feedbackRecord.setValue({
                fieldId : "custrecord_jj_customer_email",
                value: customerEmail
            });
            feedbackRecord.setValue({
                fieldId : "custrecord_jj_customer_name",
                value: customerName
            });
            feedbackRecord.setValue({
                fieldId : "custrecord_jj_email_subject",
                value: subject
            });
   
            let fedd = feedbackRecord.setValue({
                fieldId : "custrecord_jj_customer_refernce",
                value: customerId
            });
            
            
            feedbackRecord.setValue({
                fieldId : "custrecord_jj_email_message",
                value: message
            });
        
            let recordId = feedbackRecord.save({
                enableSourcing: false,
                ignoreMandatoryFields: false
            });

            return recordId;
        }
        catch(err)
        {
            log.error(err)
        }
        }

        function toCheckDuplicates(emailId)
        {
            let FLAG = true;
            try{
                let feedbackFormSearch = search.create({
                    type: search.Type.CUSTOM_RECORD + '_jj_customer_feedback',
                    title: 'My Feedback Form Search',
                    id: 'customsearch_jj_feedbackform_search_2',
                    columns: [{
                        name: 'custrecord_jj_customer_email'
                    }]
                    
                });
                

                feedbackFormSearch.run().each(function(result) {
                    let existingEmail = result.getValue({
                        name: 'custrecord_jj_customer_email'
                    });
                    log.debug(emailId,typeof(emailId));
                    log.debug(existingEmail,typeof(existingEmail));
                    if (String(existingEmail) === String(emailId))
                    {
                       FLAG = false;
                    }
                    return true;
                });
                return FLAG;
            }
            catch(err)
            {

                log.error("error",err);

               
            }
            
        }
        function findCustomerRecord(emailId)
        {
            let ID = "";
            try{
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

                customerSearch.run().each(function(result) {
                    let existingEmail = result.getValue({
                        name: 'email'
                    });
                    let internalId = result.getValue({
                        name: 'internalid'
                    });
                    if (String(existingEmail) === String(emailId))
                    {
                       ID = internalId;
                    }
                    return true;
                });
                return ID;
            }
            catch(err){
                log.error("Error from findCustomerRecord",err);
            }
        }
        function findSalesRep(customerId)
        {
            try{
                var fieldLookUp = search.lookupFields({
                    type: search.Type.CUSTOMER,
                    id: customerId,
                    columns: ['salesrep']
                });
                return fieldLookUp.salesrep[0].value

            }catch(err)
            {
                log.error("Error from findsalesrep function",err);
                return "";
            }
        }
        function sendEmail(recipientsId){
            try{
                email.send({
                    author: -5,
                    recipients: recipientsId,
                    subject: "Update on Record Creation",
                    body: "Someone has created an customer feedback record",
                });
            }catch(err)
            {
                log.error("Error on sending mail",err);
            }
        }
        function htmlCreator(customerName,customerEmail,subject,message,customerId,recordId)
        {
            let html = `<!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Customer Details</title>
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
                            <p id="customerName">${customerId}</p>
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
        }
        return { onRequest }

    });
