import { Kafka } from 'kafkajs';
import { create, toBinary, getOption } from '@bufbuild/protobuf';
import { timestampFromDate } from '@bufbuild/protobuf/wkt';
import crypto from 'crypto';
import { MenuUpdatedSchema, MenuItemSchema } from '../../gen/node/quickbite/restaurant/v1/menu_events_pb.js';
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

interface MenuUpdateItem {
  id: string;
  name: string;
  priceMinorUnits: number;
  currency: string;
  available: boolean;
}

/** Menu Update Kakfa Message
 * Whenever a restaurant updates their menu detail, it also
 * produces this message. The order service can consume this
 * message to validate if each menu item information is correct.
 */
export async function publishMenuUpdated({
  restaurantId,
  updatedItem 
}: {
  restaurantId: string;
  updatedItem: MenuUpdateItem;
}) {
  // Create message following the generated schema
  const message = create(MenuUpdatedSchema, {
    eventId: crypto.randomUUID(),
    occurredAt: timestampFromDate(new Date()),
    restaurantId,
    items: [
      create(MenuItemSchema, {
        itemId: updatedItem.id,
        name: updatedItem.name,
        priceMinorUnits: BigInt(updatedItem.priceMinorUnits),
        currency: updatedItem.currency,
        available: updatedItem.available,
      }),
    ],
  });

  // Produce the message to designated kafka
  await producer.send({
    topic: MENU_UPDATED_TOPIC,
    messages: [{ value: Buffer.from(toBinary(MenuUpdatedSchema, message)) }],
  });
}

