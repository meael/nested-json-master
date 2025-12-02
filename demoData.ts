
export const DEMO_DATA = {
  "users": {
    "user1": {
      "name": "John Doe",
      "email": "john.doe@example.com",
      "age": "28",
      "profile": {
        "bio": "Software developer passionate about web technologies",
        "avatar": "https://example.com/avatars/john.jpg",
        "social": {
          "twitter": "@johndoe",
          "github": "johndoe",
          "linkedin": "john-doe-123"
        }
      },
      "preferences": {
        "theme": "dark",
        "language": "en",
        "notifications": {
          "email": "true",
          "push": "false",
          "sms": "false"
        }
      }
    },
    "user2": {
      "name": "Jane Smith",
      "email": "jane.smith@example.com",
      "age": "32",
      "profile": {
        "bio": "UX designer and creative thinker",
        "avatar": "https://example.com/avatars/jane.jpg",
        "social": {
          "twitter": "@janesmith",
          "dribbble": "janesmith"
        }
      },
      "preferences": {
        "theme": "light",
        "language": "en",
        "notifications": {
          "email": "true",
          "push": "true",
          "sms": "true"
        }
      }
    }
  },
  "products": {
    "electronics": {
      "laptops": {
        "macbook": {
          "name": "MacBook Pro 16",
          "price": "2499",
          "specs": {
            "cpu": "M3 Max",
            "ram": "32GB",
            "storage": "1TB SSD",
            "display": "16.2 Liquid Retina XDR"
          }
        },
        "thinkpad": {
          "name": "ThinkPad X1 Carbon",
          "price": "1899",
          "specs": {
            "cpu": "Intel i7-13700H",
            "ram": "16GB",
            "storage": "512GB SSD",
            "display": "14 WUXGA"
          }
        }
      },
      "smartphones": {
        "iphone": {
          "name": "iPhone 15 Pro",
          "price": "999",
          "specs": {
            "chip": "A17 Pro",
            "storage": "256GB",
            "camera": "48MP Main",
            "display": "6.1 Super Retina XDR"
          }
        }
      }
    },
    "books": {
      "programming": {
        "cleancode": {
          "title": "Clean Code",
          "author": "Robert C. Martin",
          "price": "42",
          "isbn": "9780132350884",
          "year": "2008"
        },
        "designpatterns": {
          "title": "Design Patterns",
          "author": "Gang of Four",
          "price": "54",
          "isbn": "9780201633610",
          "year": "1994"
        }
      }
    }
  },
  "configuration": {
    "app": {
      "name": "Nested JSON Editor",
      "version": "1.0.0",
      "settings": {
        "maxDepth": "10",
        "autoSave": "true",
        "validation": {
          "enabled": "true",
          "strictMode": "false",
          "allowedKeyPattern": "^[a-zA-Z][a-zA-Z0-9]*$"
        }
      }
    },
    "database": {
      "host": "localhost",
      "port": "5432",
      "credentials": {
        "username": "admin",
        "password": "********"
      },
      "options": {
        "poolSize": "20",
        "timeout": "5000",
        "ssl": "true"
      }
    }
  },
  "analytics": {
    "pageViews": {
      "home": "15234",
      "products": "8921",
      "about": "3456"
    },
    "userStats": {
      "totalUsers": "1250",
      "activeUsers": "892",
      "newUsersThisMonth": "127"
    }
  }
};
