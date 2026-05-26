/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · data/name-pools.js
   Pools de Nomes para gerador aleatório de NPCs e Investigadores
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoCData = window.CoCData || {};

/**
 * Estrutura: window.CoCData.names[locale][era][gender] = [string]
 * locale: "ptBR" | "en"
 * era:    "1920s" | "modern"
 * gender: "male" | "female" | "neutral"
 *
 * Sobrenomes (last names) ficam em [locale].lastNames sem distinção de era/gênero.
 *
 * Mestres podem adicionar pools custom em runtime:
 *   window.CoCData.names.ptBR.modern.male.push("NovoNome");
 */

window.CoCData.names = {

  ptBR: {
    "1920s": {
      male: [
        "Alvaro", "Anselmo", "Antônio", "Arnaldo", "Arthur", "Benedito",
        "Bento", "Bernardo", "Cândido", "Cassiano", "Domingos", "Eduardo",
        "Ernesto", "Florêncio", "Frederico", "Gaspar", "Genaro", "Gervásio",
        "Heitor", "Honório", "Ignácio", "Jerônimo", "Joaquim", "Juvenal",
        "Lúcio", "Marçal", "Octávio", "Olímpio", "Otoniel", "Patrício",
        "Raul", "Reinaldo", "Romualdo", "Sebastião", "Severino", "Teobaldo",
        "Tobias", "Vicente", "Virgílio", "Waldemar"
      ],
      female: [
        "Adelaide", "Albertina", "Amélia", "Anastácia", "Antonieta", "Aurélia",
        "Beatriz", "Carlota", "Celina", "Clotilde", "Constança", "Cordélia",
        "Cremilda", "Diomira", "Eulália", "Eunice", "Felicidade", "Florinda",
        "Gertrudes", "Henriqueta", "Ifigênia", "Iolanda", "Isaura", "Jacinta",
        "Julieta", "Leonor", "Lúcia", "Margarida", "Matilde", "Olímpia",
        "Otília", "Paulina", "Raquel", "Romilda", "Sebastiana", "Severina",
        "Sinhá", "Teresa", "Úrsula", "Walquíria"
      ]
    },
    modern: {
      male: [
        "Alexandre", "André", "Bruno", "Carlos", "Daniel", "Diego",
        "Eduardo", "Fábio", "Felipe", "Fernando", "Gabriel", "Gustavo",
        "Henrique", "Igor", "João", "José", "Júnior", "Leonardo",
        "Lucas", "Marcelo", "Marco", "Mateus", "Matheus", "Miguel",
        "Murilo", "Otávio", "Paulo", "Pedro", "Rafael", "Renan",
        "Renato", "Ricardo", "Rodrigo", "Samuel", "Sérgio", "Thiago",
        "Tiago", "Vinícius", "Vitor", "Wagner"
      ],
      female: [
        "Adriana", "Amanda", "Ana", "Beatriz", "Bianca", "Camila",
        "Carolina", "Cláudia", "Daniela", "Débora", "Eliane", "Fabiana",
        "Fernanda", "Flávia", "Gabriela", "Helena", "Isabela", "Isadora",
        "Jéssica", "Juliana", "Larissa", "Letícia", "Luana", "Lúcia",
        "Maíra", "Mariana", "Marina", "Natália", "Patrícia", "Paula",
        "Priscila", "Rafaela", "Renata", "Roberta", "Sabrina", "Sara",
        "Sofia", "Tatiana", "Vanessa", "Vitória"
      ]
    },
    lastNames: [
      "Almeida", "Alves", "Andrade", "Araújo", "Azevedo", "Barbosa",
      "Barros", "Cardoso", "Carvalho", "Castro", "Cavalcanti", "Coelho",
      "Correia", "Costa", "Cunha", "Dias", "Esteves", "Faria",
      "Fernandes", "Ferreira", "Figueiredo", "Fonseca", "Freitas", "Gomes",
      "Gonçalves", "Gonzaga", "Lima", "Lopes", "Machado", "Marques",
      "Martins", "Matos", "Melo", "Mendes", "Miranda", "Monteiro",
      "Moraes", "Moreira", "Moretti", "Mota", "Nascimento", "Neves",
      "Nogueira", "Nunes", "Oliveira", "Pereira", "Pinto", "Pires",
      "Queiroz", "Ramos", "Reis", "Ribeiro", "Rocha", "Rodrigues",
      "Sá", "Santos", "Silva", "Souza", "Teixeira", "Vieira",
      "Vasconcelos", "Xavier"
    ]
  },

  en: {
    "1920s": {
      male: [
        "Albert", "Alfred", "Archibald", "Arthur", "Bernard", "Cecil",
        "Charles", "Clarence", "Edgar", "Edmund", "Edward", "Ernest",
        "Eugene", "Francis", "Frederick", "George", "Gilbert", "Harold",
        "Harvey", "Henry", "Herbert", "Horace", "Howard", "Hubert",
        "James", "Jasper", "Lawrence", "Leonard", "Leopold", "Lionel",
        "Maurice", "Mortimer", "Nigel", "Oliver", "Oswald", "Percival",
        "Reginald", "Rupert", "Sebastian", "Sidney", "Stanley", "Theodore",
        "Vincent", "Walter", "Wilfred", "Winston"
      ],
      female: [
        "Adelaide", "Agatha", "Agnes", "Beatrice", "Bessie", "Cecilia",
        "Charlotte", "Clara", "Constance", "Cordelia", "Daisy", "Dorothy",
        "Edith", "Eleanor", "Elsie", "Emma", "Esther", "Ethel",
        "Eugenia", "Evangeline", "Florence", "Frances", "Gertrude", "Gladys",
        "Hazel", "Helena", "Hortense", "Ida", "Irene", "Lillian",
        "Lucille", "Mabel", "Margaret", "Martha", "Matilda", "Maud",
        "Millicent", "Minnie", "Mildred", "Olive", "Pearl", "Phoebe",
        "Prudence", "Rosalind", "Vera", "Violet", "Winifred"
      ]
    },
    modern: {
      male: [
        "Aaron", "Adam", "Aiden", "Alex", "Andrew", "Anthony",
        "Benjamin", "Brandon", "Brian", "Caleb", "Cameron", "Carter",
        "Christopher", "Cole", "Daniel", "David", "Dylan", "Ethan",
        "Evan", "Gabriel", "Hunter", "Ian", "Isaac", "Jack",
        "Jacob", "James", "Jason", "Joshua", "Kevin", "Liam",
        "Logan", "Lucas", "Mason", "Matthew", "Michael", "Nathan",
        "Noah", "Owen", "Ryan", "Sean", "Tyler", "William"
      ],
      female: [
        "Abigail", "Alexis", "Allison", "Amanda", "Amber", "Amy",
        "Ashley", "Ava", "Brianna", "Brooke", "Chloe", "Claire",
        "Courtney", "Danielle", "Elizabeth", "Ella", "Emily", "Emma",
        "Erin", "Faith", "Grace", "Hailey", "Hannah", "Isabella",
        "Jasmine", "Jennifer", "Jessica", "Julia", "Katherine", "Kelly",
        "Kimberly", "Lauren", "Lily", "Madison", "Megan", "Mia",
        "Michelle", "Natalie", "Olivia", "Rachel", "Samantha", "Sarah",
        "Sophia", "Stephanie", "Taylor", "Victoria"
      ]
    },
    lastNames: [
      "Adams", "Anderson", "Armstrong", "Bailey", "Baker", "Barnes",
      "Bell", "Bennett", "Brooks", "Brown", "Campbell", "Carter",
      "Clark", "Coleman", "Collins", "Cook", "Cooper", "Cox",
      "Crawford", "Davis", "Edwards", "Evans", "Fisher", "Foster",
      "Graham", "Gray", "Green", "Hall", "Hamilton", "Harris",
      "Hayes", "Hill", "Hughes", "Jackson", "Jenkins", "Johnson",
      "Jones", "Kelly", "King", "Lee", "Lewis", "Long",
      "Martin", "Miller", "Mitchell", "Moore", "Moriarty", "Morgan",
      "Morris", "Murphy", "Nelson", "Owens", "Parker", "Peterson",
      "Phillips", "Powell", "Price", "Reed", "Reeves", "Reynolds",
      "Roberts", "Robinson", "Rogers", "Russell", "Scott", "Sherwood",
      "Smith", "Stewart", "Sullivan", "Taylor", "Thompson", "Turner",
      "Walker", "Ward", "Washington", "Watson", "West", "White",
      "Williams", "Wilson", "Wood", "Wright", "Young"
    ]
  }
};
