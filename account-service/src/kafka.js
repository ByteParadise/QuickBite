import { Kafka } from 'kafkajs';
import { create, toBinary } from '@bufbuild/protobuf';
import { timestampFromDate } from '@bufbuild/protobuf/wkt';
import { getOption } from '@bufbuild/protobuf';
import crypto from 'crypto';
import { AddressSavedSchema, AddressSchema } from '../gen/node/quickbite/account/v1/address_events_pb.js';
import { topic } from '../gen/node/quickbite/kafka/v1/options_pb.js';

export const ADDRESS_SAVED_TOPIC = getOption(AddressSavedSchema, topic);

const kafka = new Kafka({
  clientId: 'account-service',
  brokers: [process.env.KAFKA_BROKER ?? 'localhost:9092'],
});

export const producer = kafka.producer();

export async function connectProducer() {
  await producer.connect();
}

export async function publishAddressSaved({ customerId, addressId, line1, line2, city, state, postalCode }) {
  const message = create(AddressSavedSchema, {
    eventId: crypto.randomUUID(),
    occurredAt: timestampFromDate(new Date()),
    customerId,
    addressId,
    address: create(AddressSchema, {
      line1,
      line2: line2 ?? '',
      city,
      region: state,
      postalCode,
      countryCode: 'US',
      latitude: 0,
      longitude: 0,
    }),
  });

  await producer.send({
    topic: ADDRESS_SAVED_TOPIC,
    messages: [{ value: Buffer.from(toBinary(AddressSavedSchema, message)) }],
  });
}