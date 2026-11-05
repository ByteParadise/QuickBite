import { Kafka } from 'kafkajs';
import { getOption } from '@bufbuild/protobuf';
import { AddressSavedSchema } from '../../gen/node/quickbite/account/v1/address_events_pb.js';
import { topic } from '../../gen/node/quickbite/kafka/v1/options_pb.js';

// Get kafka topic for AddressSaved message
export const ADDRESS_SAVED_TOPIC = getOption(AddressSavedSchema, topic);

const kafka = new Kafka({
  clientId: 'account-service',
  brokers: [process.env.KAFKA_BROKER ?? 'localhost:9092'],
});

export const producer = kafka.producer();

export async function connectProducer() {
  await producer.connect();
}