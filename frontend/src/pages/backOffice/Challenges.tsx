import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import Sidebar from './components/Sidebar';

// Un simple composant Modal maison si pas de librairie UI dédiée
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-dark border border-purple-900/20 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-purple-900/20 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <span className="material-icons-outlined">close</span>
          </button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function Challenges() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: 'medium',
    category: '',
    type: 'Stage',
    constraints: '',
    language: 'javascript',
    starterCode: '',
    testCasesJson: '[]',
  });

  const apiUrl = 'http://localhost:5000/api/challenges';

  const fetchChallenges = async () => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const res = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const hint =
          data.detail ||
          (res.status === 403
            ? 'Connectez-vous avec un compte admin, ou déconnectez-vous puis reconnectez-vous si votre rôle a été modifié en base.'
            : '');
        Swal.fire(
          'Erreur',
          [data.message || 'Impossible de charger les challenges.', hint].filter(Boolean).join('\n\n'),
          'error'
        );
        return;
      }
      setChallenges(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      Swal.fire('Erreur', 'Impossible de charger les challenges.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setEditingChallenge(null);
    setFormData({
      title: '',
      description: '',
      difficulty: 'medium',
      category: '',
      type: 'Stage',
      constraints: '',
      language: 'javascript',
      starterCode: '',
      testCasesJson: '[]',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (challenge) => {
    setEditingChallenge(challenge);
    setFormData({
      title: challenge.title,
      description: challenge.description,
      difficulty: challenge.difficulty,
      category: challenge.category,
      type: challenge.type,
      constraints: challenge.constraints || '',
      language: challenge.language || 'javascript',
      starterCode: challenge.starterCode || '',
      testCasesJson: JSON.stringify(challenge.testCases?.length ? challenge.testCases : [], null, 2),
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!token) {
      Swal.fire('Erreur', 'Vous devez être connecté.', 'error');
      return;
    }
    const method = editingChallenge ? 'PUT' : 'POST';
    const url = editingChallenge ? `${apiUrl}/${editingChallenge._id}` : apiUrl;

    let testCases: { name?: string; assertion?: string }[] = [];
    try {
      const parsed = JSON.parse(formData.testCasesJson || '[]');
      testCases = Array.isArray(parsed) ? parsed : [];
    } catch {
      Swal.fire('Erreur', 'JSON des tests invalide. Corrigez le champ « Tests (JSON) ».', 'error');
      return;
    }

    const payload = {
      title: formData.title,
      description: formData.description,
      difficulty: formData.difficulty,
      category: (formData.category && formData.category.trim()) || 'general',
      type: formData.type,
      constraints: formData.constraints,
      language: formData.language || 'javascript',
      starterCode: formData.starterCode ?? '',
      testCases,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          data.message ||
          data.error ||
          (res.status === 403
            ? 'Accès refusé : seuls les administrateurs peuvent gérer les challenges.'
            : res.status === 401
              ? 'Session expirée. Reconnectez-vous.'
              : `Erreur serveur (${res.status})`);
        Swal.fire('Erreur', String(msg), 'error');
        return;
      }

      Swal.fire({
        title: 'Succès!',
        text: `Challenge ${editingChallenge ? 'modifié' : 'créé'} avec succès.`,
        icon: 'success',
        background: '#1a1a2e',
        color: '#fff',
        confirmButtonColor: '#7c3aed'
      });

      setIsModalOpen(false);
      fetchChallenges();
    } catch (error) {
      console.error(error);
      Swal.fire('Erreur', 'Impossible d\'enregistrer le challenge (réseau ou serveur).', 'error');
    }
  };

  const handleDelete = async (id) => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    
    Swal.fire({
      title: 'Êtes-vous sûr?',
      text: "Vous ne pourrez pas annuler cette action!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, supprimer!',
      background: '#1a1a2e',
      color: '#fff'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(`${apiUrl}/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!res.ok) throw new Error('Failed to delete challenge');
          
          Swal.fire({
            title: 'Supprimé!',
            text: 'Le challenge a été supprimé.',
            icon: 'success',
            background: '#1a1a2e',
            color: '#fff',
            confirmButtonColor: '#7c3aed'
          });
          
          fetchChallenges();
        } catch (error) {
          console.error(error);
          Swal.fire('Erreur', 'Impossible de supprimer le challenge.', 'error');
        }
      }
    });
  };

  return (
    <div className="flex h-screen bg-background-dark font-body text-gray-200 overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 relative overflow-auto p-4 md:p-6 space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-surface-dark border border-purple-900/20 p-6 rounded-xl">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Challenges</h1>
            <p className="text-gray-400">Gérez les énigmes et batailles de la plateforme.</p>
          </div>
          <button 
            onClick={openAddModal}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition-colors font-medium"
          >
            <span className="material-icons-outlined">add</span>
            Nouveau Challenge
          </button>
        </div>

        {/* Content */}
        <div className="bg-surface-dark border border-purple-900/20 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center">
              <span className="material-icons-outlined animate-spin text-4xl mb-4 text-primary">autorenew</span>
              <p>Chargement des challenges...</p>
            </div>
          ) : challenges.length === 0 ? (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center">
              <span className="material-icons-outlined text-6xl mb-4 opacity-50">sentiment_dissatisfied</span>
              <p className="text-lg">Aucun challenge n'a été trouvé.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-purple-900/20 border-b border-purple-900/20">
                    <th className="p-4 text-sm font-semibold text-gray-400">Titre</th>
                    <th className="p-4 text-sm font-semibold text-gray-400">Catégorie</th>
                    <th className="p-4 text-sm font-semibold text-gray-400">Type</th>
                    <th className="p-4 text-sm font-semibold text-gray-400">Difficulté</th>
                    <th className="p-4 text-sm font-semibold text-gray-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-900/20">
                  {challenges.map(challenge => (
                    <tr key={challenge._id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <p className="font-medium text-white">{challenge.title}</p>
                        <p className="text-sm text-gray-500 truncate max-w-xs">{challenge.description}</p>
                      </td>
                      <td className="p-4 text-gray-300">{challenge.category}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${challenge.type === 'Battle' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                          {challenge.type}
                        </span>
                      </td>
                      <td className="p-4">
                         <span className={`px-2 py-1 text-xs rounded-full font-medium ${challenge.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' : challenge.difficulty === 'hard' || challenge.difficulty === 'expert' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {(challenge.difficulty || 'medium').charAt(0).toUpperCase() + (challenge.difficulty || 'medium').slice(1)}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button onClick={() => openEditModal(challenge)} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors" title="Modifier">
                          <span className="material-icons-outlined text-sm">edit</span>
                        </button>
                        <button onClick={() => handleDelete(challenge._id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors" title="Supprimer">
                          <span className="material-icons-outlined text-sm">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      {/* Add / Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingChallenge ? "Modifier le Challenge" : "Nouveau Challenge"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-300">Titre</label>
              <input 
                type="text" 
                name="title" 
                value={formData.title} 
                onChange={handleInputChange} 
                required
                className="w-full bg-background-dark border border-purple-900/30 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-primary transition-colors"
                placeholder="Ex: Two Sum"
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-300">Description</label>
              <textarea 
                name="description" 
                value={formData.description} 
                onChange={handleInputChange} 
                required
                rows={3}
                className="w-full bg-background-dark border border-purple-900/30 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-primary transition-colors resize-none"
                placeholder="Description détaillée du problème..."
              ></textarea>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Catégorie</label>
              <input 
                type="text" 
                name="category" 
                value={formData.category} 
                onChange={handleInputChange} 
                required
                className="w-full bg-background-dark border border-purple-900/30 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-primary transition-colors"
                placeholder="Ex: Array, String, Algo..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Difficulté</label>
              <select 
                name="difficulty" 
                value={formData.difficulty} 
                onChange={handleInputChange}
                className="w-full bg-background-dark border border-purple-900/30 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-primary transition-colors"
              >
                <option value="easy">Easy (Facile)</option>
                <option value="medium">Medium (Moyen)</option>
                <option value="hard">Hard (Difficile)</option>
                <option value="expert">Expert</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Langage</label>
              <select
                name="language"
                value={formData.language}
                onChange={handleInputChange}
                className="w-full bg-background-dark border border-purple-900/30 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-primary transition-colors"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="typescript">TypeScript</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="csharp">C#</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-300">Code de départ</label>
              <textarea
                name="starterCode"
                value={formData.starterCode}
                onChange={handleInputChange}
                rows={4}
                className="w-full bg-background-dark border border-purple-900/30 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-primary transition-colors resize-none font-mono text-sm"
                placeholder="function maFonction(x) {\n  \n}"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-300">Tests (JSON) — optionnel</label>
              <textarea
                name="testCasesJson"
                value={formData.testCasesJson}
                onChange={handleInputChange}
                rows={6}
                className="w-full bg-background-dark border border-purple-900/30 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-primary transition-colors resize-none font-mono text-xs"
                placeholder='[{"name":"sum","assertion":"add(2,3)===5"}]'
              />
              <p className="text-xs text-gray-500">
                Chaque test : <code className="text-gray-400">name</code> et <code className="text-gray-400">assertion</code> (expression JS après le code du participant).
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Type</label>
              <select 
                name="type" 
                value={formData.type} 
                onChange={handleInputChange}
                className="w-full bg-background-dark border border-purple-900/30 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-primary transition-colors"
              >
                <option value="Stage">Stage</option>
                <option value="Battle">Battle</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-300">Contraintes (Optionnel)</label>
              <textarea 
                name="constraints" 
                value={formData.constraints} 
                onChange={handleInputChange} 
                rows={2}
                className="w-full bg-background-dark border border-purple-900/30 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-primary transition-colors resize-none"
                placeholder="Ex: 1 <= nums.length <= 10^4"
              ></textarea>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-purple-900/20">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-gray-400 hover:text-white font-medium transition-colors"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors shadow-lg shadow-primary/20"
            >
              {editingChallenge ? "Mettre à jour" : "Créer"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
