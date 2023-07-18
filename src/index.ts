const express = require('express');
const _ = require('lodash');
// const {BigQuery} = require('@google-cloud/bigquery');
// const {Storage} = require('@google-cloud/storage');
import * as gcs from '@google-cloud/storage';
const storage = new gcs.Storage();

const uuid = require('uuid');
const app = express();
const jsonBodyParser = express.json();
// const env = process.env.ENV;

// const DATASET = 'sg_data_in_webhook';
// const TABLE_EVENTS_DATA_IN = 'sg_table_events_data_in';
// const TABLE_EVENTS_RAW_IN = 'sg_table_events_raw_in';
const BUCKET_EVENTS_DATA_IN = 'eagdl-sg-events-data-in';
const BUCKET_EVENTS_RAW_IN = 'eagdl-sg-events-raw-in';

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(
    `Hello from Cloud Run! The container started successfully and is listening for HTTP requests on ${PORT}`
  );
});

const fixNames = (obj) => {
  if (Array.isArray(obj)) {
    obj.forEach(fixNames);
  } else if (obj && typeof obj === 'object') {
    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      fixNames(value);
      const fixedKey = key.replace('-', '_');
      if (fixedKey !== key) {
        obj[fixedKey] = value;
        delete obj[key];
      }
    });
  }
};

app.post('/pubsub', jsonBodyParser, async (req: any, res: any) => {
  try {
    //   const message = Buffer.from(req.body.message.data, 'base64').toString(
    //     'utf-8'
    //   );

    if (req.method !== 'POST') {
      const error = new Error('Only POST requests are accepted');
      // error.code = 405
      throw error;
    }

    const events = req.body || [];
    fixNames(events);

    const modEvents = events.map((modevent) => {
      const {email, timestamp, event, ...data} = modevent;
      const smtp_id = _.get(modevent, 'smtp_id', null);
      const asm_group_id = _.get(modevent, 'asm_group_id', null);
      return {
        email,
        timestamp,
        event,
        smtp_id,
        asm_group_id,
        data: JSON.stringify(data),
      };
    });
    // Generate EVENT DATA newline-delimited JSON
    const json = modEvents.map((event) => JSON.stringify(event)).join('\n');
    // Generate EVENTS RAW newline-delimited JSON
    const jsonRaw = events.map((event) => JSON.stringify(event)).join('\n');
    // Upload a new file to Cloud Storage if we have events to save
    if (json.length) {
      //   const storage = new Storage();
      const bucketName = BUCKET_EVENTS_DATA_IN;
      // const bucketName = config.BUCKET_EVENTS_DATA_IN;
      const unixTimestamp = new Date().getTime() * 1000;
      const fileSuffex = `${unixTimestamp}-${uuid.v4()}.json`;
      const dataFileName = `sgdata-${fileSuffex}`;
      const file = storage.bucket(bucketName).file(dataFileName);
      await file.save(json);
      console.log(`DATA JSON written to ${dataFileName}`);
      const rawFileName = `sgraw-${fileSuffex}`;
      const bucketNameRaw = BUCKET_EVENTS_RAW_IN;
      const file2 = storage.bucket(bucketNameRaw).file(rawFileName);
      await file2.save(jsonRaw);
      console.log(`RAW JSON written to ${rawFileName}`);
    }

    res.status(200).send('recived');
  } catch (error) {
    console.log(error);
    res.status(401).send('conversion failed');
  }
});
