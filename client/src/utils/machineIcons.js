import {
  Activity,
  Wind,
  Flame,
  Layers,
  Bot,
  Gauge,
  Zap,
} from 'lucide-react';

export const MACHINE_ICONS = {
  Turbine: Wind,
  Pump: Activity,
  Boiler: Flame,
  Conveyor: Layers,
  'Robotic Arm': Bot,
  Compressor: Gauge,
  Generator: Zap,
};

export function getMachineIcon(type) {
  return MACHINE_ICONS[type] || Activity;
}
