import React from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import PlayerAvatar from '../common/PlayerAvatar';
import RoleBadge from '../common/RoleBadge';
import { GripVertical, X, Star, Shield } from 'lucide-react';

function pid(player) { return player.player_id || player.id; }

function SortablePlayer({ player, index, onRemove, onToggleCaptain, onToggleKeeper, isCaptain, isKeeper }) {
  const playerId = pid(player);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: playerId.toString(),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style}
         className={`flex items-center gap-2 px-2 py-1.5 rounded-lg bg-yorked-bg/50
                    border border-transparent group
                    ${isDragging ? 'border-yorked-accent/50 shadow-lg' : 'hover:border-yorked-border/50'}`}>
      <button {...attributes} {...listeners}
              className="cursor-grab active:cursor-grabbing text-yorked-muted/50 hover:text-yorked-muted
                         shrink-0 touch-none">
        <GripVertical size={14} />
      </button>

      <span className="text-[10px] text-yorked-muted w-4 text-center font-mono shrink-0">
        {index + 1}
      </span>

      <PlayerAvatar name={player.name} country={player.country}
                    avatarColor={player.avatar_color} size="xs" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-xs text-white truncate">{player.name}</span>
          {isCaptain && <Star size={10} className="text-yorked-gold shrink-0 fill-yorked-gold" />}
          {isKeeper && <Shield size={10} className="text-amber-400 shrink-0" />}
        </div>
        <RoleBadge role={player.computed_role} subRole={player.computed_sub_role}
                   showSubRole={false} size="xs" />
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => onToggleCaptain(playerId)}
                className={`p-1 rounded transition-colors ${isCaptain ? 'text-yorked-gold' : 'text-yorked-muted/50 hover:text-yorked-gold'}`}
                title="Toggle captain">
          <Star size={12} className={isCaptain ? 'fill-yorked-gold' : ''} />
        </button>
        {(player.computed_role === 'wicketkeeper') && (
          <button onClick={() => onToggleKeeper(playerId)}
                  className={`p-1 rounded transition-colors ${isKeeper ? 'text-amber-400' : 'text-yorked-muted/50 hover:text-amber-400'}`}
                  title="Toggle keeper">
            <Shield size={12} />
          </button>
        )}
        <button onClick={() => onRemove(playerId)}
                className="p-1 rounded text-yorked-muted/50 hover:text-red-400 transition-colors"
                title="Remove">
          <X size={12} />
        </button>
      </div>
    </div>
  );
}

export default function SquadPanel({ squad, onReorder, onRemove, captainId, keeperId, onSetCaptain, onSetKeeper }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = squad.findIndex(p => pid(p).toString() === active.id);
    const newIndex = squad.findIndex(p => pid(p).toString() === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(arrayMove(squad, oldIndex, newIndex));
    }
  };

  const roles = { batsman: 0, bowler: 0, all_rounder: 0, wicketkeeper: 0 };
  squad.forEach(p => { if (roles[p.computed_role] !== undefined) roles[p.computed_role]++; });

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-yorked-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display font-semibold text-white text-sm">Squad</h3>
          <span className={`text-xs font-mono ${squad.length === 11 ? 'text-yorked-accent' : 'text-yorked-muted'}`}>
            {squad.length}/11
          </span>
        </div>
        {squad.length > 0 && (
          <div className="flex gap-2 text-[10px]">
            <span className="text-blue-400">{roles.batsman} BAT</span>
            <span className="text-red-400">{roles.bowler} BOWL</span>
            <span className="text-purple-400">{roles.all_rounder} AR</span>
            <span className="text-amber-400">{roles.wicketkeeper} WK</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {squad.length === 0 ? (
          <div className="text-center py-8 text-yorked-muted text-xs">
            Click players in the browser to add them to your squad
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={squad.map(p => pid(p).toString())} strategy={verticalListSortingStrategy}>
              {squad.map((player, i) => (
                <SortablePlayer
                  key={pid(player)}
                  player={player}
                  index={i}
                  onRemove={onRemove}
                  onToggleCaptain={onSetCaptain}
                  onToggleKeeper={onSetKeeper}
                  isCaptain={captainId === pid(player)}
                  isKeeper={keeperId === pid(player)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
