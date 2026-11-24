import React from 'react';
import type { EstadoBache, EstadoEncharcamiento } from '../types';

interface Props {
  estado: EstadoBache | EstadoEncharcamiento;
}

export const ReporteTag: React.FC<Props> = ({ estado }) => {
  const isWarn = estado === 'Rechazado' || estado === 'Activo';
  const isNeutral = estado === 'Recibido';
  const cls = isWarn ? 'warn' : isNeutral ? 'neutral' : 'ok';
  const icon = isWarn ? '⚠️' : isNeutral ? '🕒' : '✅';

  return (
    <span className={`tag ${cls}`}>
      <span aria-hidden="true">{icon} </span>
      {estado}
    </span>
  );
};