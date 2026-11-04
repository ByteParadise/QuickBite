import { Kafka } from 'kafkajs';
import { getOption } from '@bufbuild/protobuf';
import { MenuUpdatedSchema } from '../../gen/node/quickbite/restaurant/v1/menu_events_pb.js';
import { topic } from '../../gen/node/quickbite/kafka/v1/options_pb.js';

/** Get kafka topic name for MenuUpdated message */ 
export const MENU_UPDATED_TOPIC = getOption(MenuUpdatedSchema, topic);

const kafka = new Kafka({
  clientId: 'restaurant-service',
  brokers: [process.env.KAFKA_BROKER ?? 'localhost:9092'],
});

export const producer = kafka.producer();

/** Ensures kafka connection */
export async function connectProducer() {
  await producer.connect();
}