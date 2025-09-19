import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Plus, ChevronRight } from 'lucide-react';

interface EventPropertyFilterQuery {
  id: string;
  propertyName: string;
  propertyType: 'string' | 'number' | 'date' | 'boolean';
  operator: string;
  value: string;
}

interface EventPropertyFilterProps {
  eventName: string;
  properties: EventPropertyFilterQuery[];
  onAddProperty: (property: EventPropertyFilterQuery) => void;
  onUpdateProperty: (propertyId: string, property: EventPropertyFilterQuery) => void;
  onRemoveProperty: (propertyId: string) => void;
}

// Mock event properties - 실제로는 API에서 해당 이벤트의 속성들을 로드
const getEventProperties = (eventName: string) => {
  const propertyMap: Record<string, Array<{name: string, type: string}>> = {
    'Complete Order': [
      { name: 'order_id', type: 'string' },
      { name: 'total_amount', type: 'number' },
      { name: 'product_category', type: 'string' },
      { name: 'payment_method', type: 'string' },
      { name: 'is_premium_order', type: 'boolean' }
    ],
    'Product Viewed': [
      { name: 'product_id', type: 'string' },
      { name: 'product_name', type: 'string' },
      { name: 'product_price', type: 'number' },
      { name: 'category', type: 'string' }
    ],
    'Login': [
      { name: 'login_method', type: 'string' },
      { name: 'is_first_login', type: 'boolean' },
      { name: 'session_duration', type: 'number' }
    ]
  };
  
  return propertyMap[eventName] || [];
};

const getOperatorsByType = (type: string) => {
  switch (type) {
    case 'string':
      return [
        { value: 'is', label: 'is' },
        { value: 'is not', label: 'is not' },
        { value: 'contains', label: 'contains' },
        { value: 'does not contain', label: 'does not contain' }
      ];
    case 'number':
      return [
        { value: '=', label: 'equals' },
        { value: '>', label: 'greater than' },
        { value: '≥', label: 'greater than or equal to' },
        { value: '<', label: 'less than' },
        { value: '≤', label: 'less than or equal to' }
      ];
    case 'boolean':
      return [
        { value: 'is true', label: 'is true' },
        { value: 'is false', label: 'is false' }
      ];
    default:
      return [];
  }
};

export const EventPropertyFilter: React.FC<EventPropertyFilterProps> = ({
  eventName,
  properties,
  onAddProperty,
  onUpdateProperty,
  onRemoveProperty
}) => {
  const [showPropertySelector, setShowPropertySelector] = useState(false);
  const availableProperties = getEventProperties(eventName);

  const handlePropertySelect = (propertyData: {name: string, type: string}) => {
    const defaultOperator = propertyData.type === 'string' ? 'is' : 
                           propertyData.type === 'number' ? '=' : 'is true';
    
    const newProperty: EventPropertyFilterQuery = {
      id: `prop_${Date.now()}`,
      propertyName: propertyData.name,
      propertyType: propertyData.type as any,
      operator: defaultOperator,
      value: propertyData.type === 'boolean' ? '' : ''
    };
    
    onAddProperty(newProperty);
    setShowPropertySelector(false);
  };

  const updateProperty = (propertyId: string, field: keyof EventPropertyFilterQuery, value: any) => {
    const property = properties.find(p => p.id === propertyId);
    if (property) {
      onUpdateProperty(propertyId, { ...property, [field]: value });
    }
  };

  return (
    <div className="ml-8 space-y-2">
      {/* Existing property filters */}
      {properties.map((property) => (
        <div key={property.id} className="flex items-center space-x-2 text-sm p-2 bg-blue-25 border-l-2 border-blue-300 rounded">
          <ChevronRight className="h-3 w-3 text-blue-600" />
          <span className="text-blue-700 font-medium">where</span>
          
          <span className="font-mono bg-white px-2 py-0.5 rounded text-xs border">
            {property.propertyName}
          </span>
          
          <Select
            value={property.operator}
            onValueChange={(value) => updateProperty(property.id, 'operator', value)}
          >
            <SelectTrigger className="w-auto min-w-24 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getOperatorsByType(property.propertyType).map(option => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {!['is true', 'is false'].includes(property.operator) && (
            <Input
              value={property.value}
              onChange={(e) => updateProperty(property.id, 'value', e.target.value)}
              placeholder="Enter value..."
              className="w-24 h-7 text-xs"
            />
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemoveProperty(property.id)}
            className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
          >
            ×
          </Button>
        </div>
      ))}
      
      {/* Add property button */}
      {!showPropertySelector ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPropertySelector(true)}
          className="text-xs text-blue-600 hover:text-blue-800 h-7"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Filter
        </Button>
      ) : (
        <div className="space-y-1 p-2 bg-white border rounded-md shadow-sm">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Select {eventName} property to filter:
          </div>
          {availableProperties.map((prop) => (
            <Button
              key={prop.name}
              variant="ghost"
              className="w-full justify-between h-6 text-xs"
              onClick={() => handlePropertySelect(prop)}
            >
              <span>{prop.name}</span>
              <span className="text-xs text-muted-foreground">({prop.type})</span>
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPropertySelector(false)}
            className="w-full text-xs text-muted-foreground h-6"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};
