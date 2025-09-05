import { useParams } from 'react-router-dom';
export default function CategoryPage() {
  const { slug } = useParams();
  return <div className="p-6">Category Page for: {slug}</div>
}
