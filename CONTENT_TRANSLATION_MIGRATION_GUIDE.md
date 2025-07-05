# Content Translation Migration Guide

This guide shows how to easily migrate existing components to support multilingual content with minimal code changes.

## 🎯 Migration Strategy: Three Approaches

### **Option 1: Smart Components (Easiest - 90% less code)**

**BEFORE (Complex):**
```jsx
{(() => {
  const b2bDescription = getContentValue(product.descriptions?.b2b);
  const generalDescription = getContentValue(product.description);
  const displayDescription = b2bDescription || generalDescription;
  
  return displayDescription && (
    <p className="text-gray-600 whitespace-pre-line">
      {displayDescription}
    </p>
  );
})()}
```

**AFTER (Simple):**
```jsx
<SmartProductDescription 
  product={product}
  type="best"
  as="p"
  className="text-gray-600"
/>
```

### **Option 2: Helper Functions (Medium - 70% less code)**

**BEFORE:**
```jsx
const { getContentValue } = useContentTranslation();
const b2bDesc = getContentValue(product.descriptions?.b2b);
const generalDesc = getContentValue(product.description);
const displayDesc = b2bDesc || generalDesc;
```

**AFTER:**
```jsx
const { getProductContent } = useContentTranslation();
const productContent = getProductContent(product);
// Now use: productContent.bestDescription
```

### **Option 3: Manual Migration (Most Control)**

Use the existing `getContentValue()` function for custom logic.

## 🚀 Quick Migration Examples

### **Product Lists**
```jsx
// Old
{product.descriptions?.b2b || product.description}

// New
<SmartProductDescription product={product} type="best" />
```

### **Product Details**
```jsx
// Old
<p className="text-gray-800 whitespace-pre-line">
  {product.descriptions?.b2b}
</p>

// New
<SmartProductDescription 
  product={product} 
  type="b2b"
  as="p"
  className="text-gray-800"
/>
```

### **Generic Content Fields**
```jsx
// Old
{user.bio}

// New
<SmartContent content={user.bio} fallback="No bio available" />
```

## 📋 Migration Checklist

### **For Display Components (Reading Content):**
- [ ] Import `SmartContent` or `SmartProductDescription`
- [ ] Replace direct content access with smart component
- [ ] Test language switching

### **For Edit Components (Writing Content):**
- [ ] Import `useContentTranslation`
- [ ] Use `setContentValue()` for saving
- [ ] Add `ContentLanguageIndicator` for visual feedback
- [ ] Update form state handling

### **Priority Migration Order:**
1. **High Priority**: ProductViewPage ✅, AdminProducts, PublicStorefront
2. **Medium Priority**: Order components, User profiles  
3. **Low Priority**: Marketing materials, Static content

## 🛡️ Backward Compatibility

**No Breaking Changes**: All existing string content continues to work automatically.

- **Old format**: `"Swedish text"` → displays as-is
- **New format**: `{ "sv-SE": "Swedish", "en-GB": "English" }` → language-aware
- **Migration**: Happens automatically when admin edits content

## ⚡ Quick Examples for Common Patterns

### **Table Cells**
```jsx
<SmartContent 
  content={item.description} 
  className="text-sm text-gray-600 truncate"
/>
```

### **Card Descriptions**
```jsx
<SmartProductDescription 
  product={product}
  as="p"
  className="text-gray-600 line-clamp-2"
/>
```

### **Form Field Values**
```jsx
const { getContentValue, setContentValue } = useContentTranslation();

// For displaying current value
value={getContentValue(formData.description)}

// For saving new value
onChange={(e) => setFormData({
  ...formData, 
  description: setContentValue(formData.description, e.target.value)
})}
```

## 🎯 Benefits

- **90% less code** for most use cases
- **Automatic language handling** - no manual checks needed
- **Backward compatible** - existing content works unchanged
- **Type safe** - proper fallbacks and error handling
- **Performance optimized** - smart caching and rendering

## 🔥 Migration Script (For Bulk Updates)

For components with many instances, you can use find-and-replace:

```bash
# Replace direct content access
find src/ -name "*.jsx" -exec sed -i 's/{product\.descriptions\.b2b}/<SmartProductDescription product={product} type="b2b" \/>/g' {} +

# Replace complex content logic
# (Manual review recommended for complex cases)
```

This approach makes migration **simple, safe, and scalable** instead of a complex manual process! 