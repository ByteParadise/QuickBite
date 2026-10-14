import { Kafka } from 'kafkajs';
import { create, toBinary } from '@bufbuild/protobuf';
import { timestampFromDate } from '@bufbuild/protobuf/wkt';
import crypto from 'crypto';
import { MenuUpdatedSchema, MenuItemSchema } from '../gen/node/quickbite/restaurant/v1/menu_events_pb.js';

export const MENU_UPDATED_TOPIC = 'quickbite.restaurant.v1.MenuUpdated';

const kafka = new Kafka({
  clientId: 'restaurant-service',
  brokers: [process.env.KAFKA_BROKER ?? 'localhost:9092'],
});

export const producer = kafka.producer();

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

export async function publishMenuUpdated({
  restaurantId,
  item 
}: {
  restaurantId: string;
  item: MenuUpdateItem;
}) {
  const message = create(MenuUpdatedSchema, {
    eventId: crypto.randomUUID(),
    occurredAt: timestampFromDate(new Date()),
    restaurantId,
    items: [
      create(MenuItemSchema, {
        itemId: item.id,
        name: item.name,
        priceMinorUnits: BigInt(item.priceMinorUnits),
        currency: item.currency,
        available: item.available,
      }),
    ],
  });

  await producer.send({
    topic: MENU_UPDATED_TOPIC,
    messages: [{ value: Buffer.from(toBinary(MenuUpdatedSchema, message)) }],
  });
}

