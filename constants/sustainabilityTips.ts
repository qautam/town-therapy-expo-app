import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type SustainabilityTip = {
  id: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  text: string;
};

/** Rotating home tips — environment & sustainability, with a wink. */
export const SUSTAINABILITY_TIPS: SustainabilityTip[] = [
  {
    id: '1',
    icon: 'water-outline',
    text: 'Turn off the tap while soaping up. Your faucet is not a fountain — it wastes about 6 litres a minute.',
  },
  {
    id: '2',
    icon: 'bulb-outline',
    text: 'Swap one bulb for an LED. Same glow, up to 80% less electricity, and far fewer “why is the bill like this?” moments.',
  },
  {
    id: '3',
    icon: 'leaf-outline',
    text: 'Carry a cloth bag. One tote can retire hundreds of plastic ones — fashionably, even.',
  },
  {
    id: '4',
    icon: 'bicycle-outline',
    text: 'Walk or cycle for short trips. Your car can take a coffee break; your lungs will thank you.',
  },
  {
    id: '5',
    icon: 'restaurant-outline',
    text: "Finish what's on your plate. Food in landfills doesn't compost politely — it belches methane.",
  },
  {
    id: '6',
    icon: 'rainy-outline',
    text: 'Collect rainwater for plants. Free irrigation, delivered by the monsoon. Tip optional.',
  },
  {
    id: '7',
    icon: 'phone-portrait-outline',
    text: "Unplug idle chargers. They're still snacking on power like guests who never leave.",
  },
  {
    id: '8',
    icon: 'trash-bin-outline',
    text: "Segregate wet and dry waste. Clean dry waste is recycling's favourite kind of guest.",
  },
  {
    id: '9',
    icon: 'sunny-outline',
    text: "Dry clothes in the sun when you can. Nature's dryer — no coin slots, excellent reviews.",
  },
  {
    id: '10',
    icon: 'flower-outline',
    text: 'Plant a native tree. Local plants are low-maintenance roommates; exotic ones send drama.',
  },
  {
    id: '11',
    icon: 'leaf-outline',
    text: 'At street stalls, ask for a leaf plate or bowl instead of plastic. Same snack, cleaner streets.',
  },
  {
    id: '12',
    icon: 'car-outline',
    text: 'Switch the engine off at long waits. Idle driving burns fuel and foul air for nowhere.',
  },
  {
    id: '13',
    icon: 'snow-outline',
    text: 'Set the AC 1° warmer. Your skin adjusts; the electricity meter throws a tiny party.',
  },
  {
    id: '14',
    icon: 'earth-outline',
    text: "Repair before you replace. Most gadgets aren't broken — they're just being dramatic.",
  },
  {
    id: '15',
    icon: 'people-outline',
    text: 'Join a cleanup. One hour with neighbors can outshine a whole week of “someone should do it.”',
  },
  {
    id: '16',
    icon: 'fish-outline',
    text: 'Skip plastic straws and cutlery. The ocean already has enough accessories.',
  },
  {
    id: '17',
    icon: 'shirt-outline',
    text: 'Wash clothes in cold water. Hot cycles mostly heat the water, not your fashion sense.',
  },
  {
    id: '18',
    icon: 'nutrition-outline',
    text: 'Pick local, seasonal produce. Shorter journeys for veggies mean fewer food miles and fresher gossip.',
  },
  {
    id: '19',
    icon: 'print-outline',
    text: "Think before you print. Trees are busy being trees — they didn't apply for paperwork duty.",
  },
  {
    id: '20',
    icon: 'car-outline',
    text: "Keep tires properly inflated. Soft tires drink fuel like it's free.",
  },
  {
    id: '21',
    icon: 'flame-outline',
    text: 'Use a lid while boiling. Steam that escapes is just your gas bill waving goodbye.',
  },
  {
    id: '22',
    icon: 'home-outline',
    text: 'Close curtains on hot afternoons. Let the sun roast outside; your AC already has a day job.',
  },
  {
    id: '23',
    icon: 'battery-charging-outline',
    text: "Don't leave phones charging forever. Batteries age faster when they never get a night off.",
  },
  {
    id: '24',
    icon: 'book-outline',
    text: 'Share or borrow tools and books. One shared drill beats five lonely ones in closets.',
  },
  {
    id: '25',
    icon: 'paw-outline',
    text: 'Keep plastic out of street drains. Blocked drains invent floods — and mosquitoes RSVP first.',
  },
  {
    id: '26',
    icon: 'moon-outline',
    text: "Switch lights off when you leave a room. Empty rooms don't need mood lighting.",
  },
  {
    id: '27',
    icon: 'volume-mute-outline',
    text: 'Ease off the horn. Honking won’t make the jam move — it just makes you the town’s loudest problem.',
  },
  {
    id: '28',
    icon: 'thermometer-outline',
    text: "Cool hot food before refrigerating. Your fridge isn't a firefighter.",
  },
  {
    id: '29',
    icon: 'water-outline',
    text: 'Fix that dripping tap. One slow leak can waste hundreds of litres a month at home.',
  },
  {
    id: '30',
    icon: 'heart-outline',
    text: 'Pass a tip to a neighbor. Gossip travels fast — let this kind be useful.',
  },
];

/** Fisher–Yates shuffle — returns a new array. */
export function shuffleTips<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}
