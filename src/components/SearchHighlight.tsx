interface SearchHighlightProps {
  text: string;
  searchTerm: string;
  className?: string;
}

export const SearchHighlight: React.FC<SearchHighlightProps> = ({
  text,
  searchTerm,
  className = ""
}) => {
  if (!searchTerm.trim()) {
    return <span className={className}>{text}</span>;
  }

  const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
  
  return (
    <span className={className}>
      {parts.map((part, index) => (
        <span
          key={index}
          className={
            part.toLowerCase() === searchTerm.toLowerCase()
              ? 'font-bold bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded'
              : ''
          }
        >
          {part}
        </span>
      ))}
    </span>
  );
};
