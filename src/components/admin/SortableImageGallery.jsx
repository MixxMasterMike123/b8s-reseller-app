import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Individual sortable image item
const SortableImageItem = ({ id, imageUrl, onRemove, label, className = "" }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${className} ${isDragging ? 'z-50' : ''}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <img 
          src={imageUrl} 
          alt={`Bild ${id}`} 
          className="w-full h-24 object-cover border border-gray-300 rounded-md"
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-200 rounded-md flex items-center justify-center">
          <div className="text-white opacity-0 hover:opacity-100 transition-opacity duration-200 text-xs font-medium">
            Dra för att ändra ordning
          </div>
        </div>
      </div>
      
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(id)}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
          title="Ta bort denna bild"
        >
          ×
        </button>
      )}
      
      {label && (
        <div className="absolute bottom-1 left-1 bg-blue-500 text-white text-xs px-1 rounded">
          {label}
        </div>
      )}
    </div>
  );
};

// Main sortable gallery component
const SortableImageGallery = ({ 
  images, 
  onReorder, 
  onRemove, 
  label = "Befintliga bilder:",
  itemLabel = "Befintlig",
  className = "grid grid-cols-2 md:grid-cols-4 gap-4"
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = images.findIndex(img => img.id === active.id);
      const newIndex = images.findIndex(img => img.id === over.id);
      
      const newImages = arrayMove(images, oldIndex, newIndex);
      onReorder(newImages);
    }
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-2">{label}</h4>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={images.map(img => img.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className={className}>
            {images.map((image) => (
              <SortableImageItem
                key={image.id}
                id={image.id}
                imageUrl={image.url}
                onRemove={onRemove ? () => onRemove(image.id) : null}
                label={itemLabel}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default SortableImageGallery; 