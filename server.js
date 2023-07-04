const express = require("express");
const app = express();
const mysql = require("mysql");
const cors = require("cors");
const jwt = require('jsonwebtoken')
const bcrypt = require("bcryptjs");
const users = []
const session = require("express-session");
app.use(express.json());
app.use(cors());

const db = mysql.createPool({
  user: "licentadb_cheeseroom",
  host: "iud.h.filess.io",
  password: "0c807f2beb06f995a20b06c2f62ad75bcdd66420",
  port: "3307",
  database: "licentadb_cheeseroom",
});

let saltRounds = 10;
app.post("/register", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const username = req.body.username;
  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      console.log(err);
    } else {
      db.query(
        "SELECT pfpcode FROM pfp WHERE id BETWEEN 1 AND 2 ORDER BY RAND() LIMIT 1;",
        (err, result) => {
          if (err) {
            console.log(err);
            res.status(500).send("Error occurred while registering");
          } else {
            db.query(
              "SELECT * FROM users WHERE email = ?",
              [email],
              (err, result2) => {
                if (err) {
                  console.log(err);
                  res.status(500).send("Error occurred while registering");
                } else if (result2.length > 0) {
                  res.status(409).send("Email already exists");
                } else {
                  db.query(
                    "INSERT INTO users (email, password, username, pfp, date_created) VALUES (?,?,?,?, CURRENT_TIMESTAMP)",
                    [email, hash, username, result[0].pfpcode],
                    (err, result3) => {
                      if (err) {
                        console.log(err);
                        res
                          .status(500)
                          .send("Error occurred while registering");
                      } else {
                        res.json(result3);
                      }
                    }
                  );
                }
              }
            );
          }
        }
      );
    }
  });
});

const verifyJWT = (req, res, next) => {
  const token = req.headers["x-access-token"]
  if (!token) {
    res.json({ error: "We need a token" })
  } else {
    jwt.verify(token, "jwtSecret", (err, decoded) => {
      if (err) {
        res.json({ auth: false, message: "You failed auth" });
      } else {
        req.userId = decoded.id;
        req.username = decoded.username;
        req.email = decoded.email;
        next();
      }
    });
  }
};

app.get('/isUserAuth', verifyJWT, (req, res) => {
  res.json({ userId: req.userId, username: req.username, email: req.email })
});

app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  db.query(
    "SELECT * FROM users WHERE email = ?;",
    email,
    (err, result) => {
      if (err) {
        res.send({ err: err });
      }
      if (result.length > 0) {
        bcrypt.compare(password, result[0].password, (error, response) => {
          if (response) {
            const id = result[0].id
            const token = jwt.sign({ id: id, username: result[0].username, email: result[0].email }, "jwtSecret")
            res.json({ auth: true, token: token, result: result, username: result[0].username, email: result[0].email, id: result[0].id });
          } else if (!response) {
            res.status(401).json({ auth: false, message: "Incorrect email or password" });
          }
        }
        );
      } else {
        res.status(404).json({ auth: false, message: "Email doesn't exist" });
      }
    }
  );
});

app.post("/test", (req, res) => {
  console.log("tresttttttt")
  db.query("select * from users",
    (err, result) => {
      if (err) console.log(err);
      else {
        res.json(result[0].email);
      }
    }
  );
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

app.post("/change-pfp", verifyJWT, (req, res) => {
  const id = req.userId;
  const pfpcode = req.body.pfpcode;
  db.query(
    "UPDATE users SET pfp = ? WHERE id = ?",
    [pfpcode, id],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        db.query(
          "SELECT src FROM pfp WHERE pfpcode = ?",
          pfpcode,
          (err, result) => {
            if (err) {
              console.log(err);
            } else {
              res.json({
                type: "success",
                message: "pfp changed successfully",
              });
            }
          }
        );
      }
    }
  );
});

app.get("/fetch-pfps", (req, res) => {
  db.query(
    "SELECT src, pfpcode FROM pfp",
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        res.json(result)
      }
    }
  );
});

app.post("/myprofile", verifyJWT, (req, res) => {
  const id = req.userId;
  db.query(
    "SELECT src FROM pfp WHERE pfpcode = (SELECT pfp FROM users WHERE id = ?)",
    [id],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        db.query(
          "SELECT date_created FROM users WHERE id = ?",
          [id],
          (err, result2) => {
            if (err) {
              console.log(err);
            } else {
              db.query(
                "SELECT description FROM users WHERE id = ?",
                [id],
                (err, result3) => {
                  if (err) {
                    console.log(err);
                  } else {
                    db.query(
                      "SELECT location FROM users WHERE id = ?",
                      [id],
                      (err, result4) => {
                        if (err) {
                          console.log(err);
                        } else {
                          res.json({ pfp_src: result[0].src, date_created: result2[0].date_created, description: result3[0].description, location: result4[0].location });
                        }
                      }
                    );
                  }
                }
              );
            }
          }
        );
      }
    });
});


app.post("/update-description", verifyJWT, (req, res) => {
  const id = req.userId;
  const description = req.body.description;
  db.query(
    "UPDATE users SET description = ? WHERE id = ?",
    [description, id],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        res.json({
          type: "success",
          message: "Description updated successfully",
        });
      }
    }
  );
});

app.post("/update-location", verifyJWT, (req, res) => {
  const id = req.userId;
  const location = req.body.location;
  db.query(
    "UPDATE users SET location = ? WHERE id = ?",
    [location, id],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        res.json({
          type: "success",
          message: "Location updated successfully",
        });
      }
    }
  );
});

app.get("/fetch-movies", verifyJWT, (req, res) => {
  const userId = req.userId;
  const status = req.query.status;
  db.query("SELECT * FROM movies WHERE id_user = ?", [userId], (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("Error occurred while retrieving movies");
    } else {
      res.json({ movies: result.map(movie => ({ ...movie, rating: movie.rating || '' })) });
    }
  });
});

app.post("/add-movie", verifyJWT, (req, res) => {
  const id_movies = req.body.id_movies;
  const userId = req.userId;
  const status = req.body.status;
  db.query(
    "INSERT INTO movies (id_movies, id_user, status, favourite) VALUES (?, ?, ?, ?)",
    [id_movies, userId, status, 0],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error occurred while adding movie");
      } else {
        res.json(result);
      }
    }
  );
});

app.post("/add-movie-favourite", verifyJWT, (req, res) => {
  const id_movies = req.body.id_movies;
  const userId = req.userId;
  const favourite = req.body.favourite;
  db.query(
    "UPDATE movies SET favourite = ? WHERE id_movies = ? AND id_user = ?",
    [favourite, id_movies, userId],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error occurred while adding movie");
      } else {
        res.json(result);
      }
    }
  );
});

app.post("/remove-movie-favourite", verifyJWT, (req, res) => {
  const movieId = req.body.movieId;
  const userId = req.userId;
  db.query(
    "UPDATE movies SET favourite = 0 WHERE id_movies = ? AND id_user = ? AND favourite = 1",
    [movieId, userId],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error occurred while removing movie from favourites");
      } else if (result.affectedRows === 0) {
        res.status(404).send("Movie not found in favourites");
      } else {
        res.json(result);
      }
    }
  );
});

app.delete("/remove-movie/:id", verifyJWT, (req, res) => {
  const movieId = req.params.id;
  const userId = req.userId;
  const status = req.query.status;
  db.query(
    "DELETE FROM movies WHERE id_movies = ? AND id_user = ?",
    [movieId, userId],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error occurred while removing movie");
      } else if (result.affectedRows === 0) {
        res.status(404).send("Movie not found");
      } else {
        res.json(result);
      }
    }
  );
});

app.post("/check-movie", verifyJWT, (req, res) => {
  const id_movies = req.body.id_movies;
  const userId = req.userId;
  db.query(
    "SELECT * FROM movies WHERE id_user = ? AND id_movies = ?",
    [userId, id_movies],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error occurred while checking movie");
      } else {
        res.json({ exists: result.length > 0 });
      }
    }
  );
});

app.post("/check-movie-favourite", verifyJWT, (req, res) => {
  const id_movies = req.body.id_movies;
  const userId = req.userId;
  db.query(
    "SELECT * FROM movies WHERE id_user = ? AND id_movies = ? AND favourite = 1",
    [userId, id_movies],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error occurred while checking movie");
      } else {
        res.json({ exists: result.length > 0 });
      }
    }
  );
});

app.post("/fetch-movie-favourite", verifyJWT, (req, res) => {
  const userId = req.userId;
  db.query(
    "SELECT * FROM movies WHERE id_user = ? AND favourite = 1",
    [userId],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error occurred while checking movie");
      } else {
        res.json({ movies: result });
      }
    }
  );
});

app.put("/update-movie-rating", verifyJWT, (req, res) => {
  const movieId = req.body.id_movies;
  const userId = req.userId;
  const rating = req.body.rating;
  db.query(
    "UPDATE movies SET rating = ? WHERE id_movies = ? AND id_user = ?",
    [rating, movieId, userId],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error occurred while updating movie rating");
      } else {
        res.json(result);
      }
    }
  );
});

app.get("/average-rating/:movieId", (req, res) => {
  const movieId = req.params.movieId;
  db.query(
    "SELECT ROUND(AVG(rating), 2) as average_rating FROM movies WHERE id_movies = ?",
    [movieId],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error occurred while retrieving average rating");
      } else {
        res.json({ averageRating: result[0].average_rating });
      }
    }
  );
});

// Add a review
app.post("/add-review", verifyJWT, (req, res) => {
  const userId = req.userId;
  const movieId = req.body.movieId;
  const review = req.body.review;
  db.query(
    "INSERT INTO reviews (user_id, movie_id, review) VALUES (?, ?, ?)",
    [userId, movieId, review],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error occurred while adding review");
      } else {
        res.json(result);
      }
    }
  );
});

// Get all reviews for a movie
app.get("/movie-reviews/:movieId", (req, res) => {
  const movieId = req.params.movieId;
  db.query(
    "SELECT r.id, r.movie_id, r.user_id, r.review, u.username FROM reviews r INNER JOIN users u ON r.user_id = u.id LEFT JOIN ( SELECT review_id, COUNT(*) AS like_count FROM review_likes GROUP BY review_id ) rl ON r.id = rl.review_id WHERE r.movie_id = ? ORDER BY like_count DESC;",
    [movieId],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error occurred while retrieving reviews");
      } else {
        res.json(result);
      }
    }
  );
});

// Get all reviews by a user
app.get("/user-reviews/:userId", (req, res) => {
  const userId = req.params.userId;
  db.query(
    "SELECT * FROM reviews WHERE user_id = ?",
    [userId],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error occurred while retrieving reviews");
      } else {
        res.json(result);
      }
    }
  );
});

// Update a review
app.put("/update-review/:id", (req, res) => {
  const reviewId = req.params.id;
  const review = req.body.review;
  db.query(
    "UPDATE reviews SET review = ? WHERE id = ?",
    [review, reviewId],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error occurred while updating review");
      } else {
        res.json(result);
      }
    }
  );
});

// Delete a review
app.delete("/delete-review/:id", verifyJWT, (req, res) => {
  const reviewId = req.params.id;
  const userId = req.userId; // Get the user ID from the authenticated user
  db.query(
    "SELECT * FROM reviews WHERE id = ?",
    reviewId,
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error occurred while deleting review");
      } else if (result.length === 0) {
        res.status(404).send("Review not found");
      } else if (result[0].user_id !== userId) {
        res.status(403).send("You are not authorized to delete this review");
      } else {
        db.query(
          "DELETE FROM reviews WHERE id = ?",
          reviewId,
          (err, result) => {
            if (err) {
              console.log(err);
              res.status(500).send("Error occurred while deleting review");
            } else {
              // Delete corresponding review_likes records
              db.query(
                "DELETE FROM review_likes WHERE review_id = ?",
                reviewId,
                (err, result) => {
                  if (err) {
                    console.log(err);
                    res.status(500).send("Error occurred while deleting review_likes");
                  } else {
                    res.json(result);
                  }
                }
              );
            }
          }
        );
      }
    }
  );
});

app.post("/movies/:id/reviews", (req, res) => {
  const movieId = req.params.id;
  const review = req.body.review;
  const rating = req.body.rating;
  const userId = req.user.id;
  db.query(
    "INSERT INTO reviews (user_id, movie_id, review, rating) VALUES (?, ?, ?, ?)",
    [userId, movieId, review, rating],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error occurred while adding review");
      } else {
        res.json(result);
      }
    }
  );
});

app.get('/users/:id', verifyJWT, (req, res) => {
  const id = req.params.id;
  db.query(
    "SELECT * FROM users WHERE id = ?",
    [id],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error occurred while searching user");
      } else if (result.length === 0) {
        res.status(404).send("User not found");
      } else {
        res.json(result[0]);
      }
    }
  );
});

app.get('/search-users/:username', (req, res) => {
  const username = req.params.username;
  db.query(
    "SELECT * FROM users WHERE username LIKE ?",
    `%${username}%`,
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error occurred while searching users");
      } else {
        res.json(result);
      }
    }
  );
});

app.post('/profile/:id', (req, res) => {
  const id = req.params.id;
  const myId = req.body.myId;
  db.query(
    "SELECT src FROM pfp WHERE pfpcode = (SELECT pfp FROM users WHERE id = ?)",
    [id],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        db.query(
          "SELECT date_created FROM users WHERE id = ?",
          [id],
          (err, result2) => {
            if (err) {
              console.log(err);
            } else {
              db.query(
                "SELECT description FROM users WHERE id = ?",
                [id],
                (err, result3) => {
                  if (err) {
                    console.log(err);
                  } else {
                    db.query(
                      "SELECT location, username FROM users WHERE id = ?",
                      [id],
                      (err, result4) => {
                        if (err) {
                          console.log(err);
                        } else {
                          db.query(
                            "SELECT * FROM licentadb_cheeseroom.friends where (user1_id = ? AND user2_id = ?) OR (user2_id = ? AND user1_id = ?)",
                            [id, myId, id, myId],
                            (err, result5) => {
                              if (err) {
                                console.log(err);
                              } else {
                                if(result5.length !== 0 && result5[0].status === "accepted"){
                                  res.json({ pfp_src: result[0].src, date_created: result2[0].date_created, description: result3[0].description, location: result4[0].location, username: result4[0].username, alreadyFriends: true});
                                }
                                else{
                                  res.json({ pfp_src: result[0].src, date_created: result2[0].date_created, description: result3[0].description, location: result4[0].location, username: result4[0].username, alreadyFriends: false});
                                }
                              }
                            }
                          );
                        }
                      }
                    );
                  }
                }
              );
            }
          }
        );
      }
    });
});

app.get('/fetch-movies/:id', (req, res) => {
  const userId = req.params.id;
  db.query("SELECT * FROM movies WHERE id_user = ?", [userId], (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("Error occurred while retrieving movies");
    } else {
      res.json({ movies: result });
    }
  });
});

app.get('/fetch-movie-favourite/:id', (req, res) => {
  const userId = req.params.id;
  db.query("SELECT * FROM movies WHERE id_user = ? AND favourite = 1",
    [userId],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error occurred while checking movie");
      } else {
        res.json({ movies: result });
      }
    }
  );
});
//review likes
app.get("/review-likes/:reviewId", (req, res) => {
  const reviewId = req.params.reviewId;
  db.query(
    "SELECT COUNT(*) as likes FROM review_likes WHERE review_id = ?",
    [reviewId],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error occurred while retrieving likes");
      } else {
        res.json(result[0]);
      }
    }
  );
});

app.post("/toggle-like/:reviewId", verifyJWT, (req, res) => {
  const reviewId = req.params.reviewId;
  const userId = req.userId;
  db.query(
    "SELECT * FROM review_likes WHERE review_id = ? AND user_id = ?",
    [reviewId, userId],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error occurred while checking like status");
      } else {
        if (result.length > 0) {
          // Like exists, remove it
          db.query(
            "DELETE FROM review_likes WHERE review_id = ? AND user_id = ?",
            [reviewId, userId],
            (err, result) => {
              if (err) {
                console.log(err);
                res.status(500).send("Error occurred while removing like");
              } else {
                // Retrieve the updated like count after removing the like
                db.query(
                  "SELECT COUNT(*) as likes FROM review_likes WHERE review_id = ?",
                  [reviewId],
                  (err, result) => {
                    if (err) {
                      console.log(err);
                      res.status(500).send("Error occurred while retrieving updated likes count");
                    } else {
                      res.json({ message: "Like removed", likes: result[0].likes });
                    }
                  }
                );
              }
            }
          );
        } else {
          // Like does not exist, add it
          db.query(
            "INSERT INTO review_likes (review_id, user_id, movie_id) SELECT ?, ?, movie_id FROM reviews WHERE id = ?",
            [reviewId, userId, reviewId],
            (err, result) => {
              if (err) {
                console.log(err);
                res.status(500).send("Error occurred while adding like");
              } else {
                // Retrieve the updated like count after adding the like
                db.query(
                  "SELECT COUNT(*) as likes FROM review_likes WHERE review_id = ?",
                  [reviewId],
                  (err, result) => {
                    if (err) {
                      console.log(err);
                      res.status(500).send("Error occurred while retrieving updated likes count");
                    } else {
                      res.json({ message: "Like added", likes: result[0].likes });
                    }
                  }
                );
              }
            }
          );
        }
      }
    }
  );
});

app.post("/check-like/:reviewId", verifyJWT, (req, res) => {
  const reviewId = req.params.reviewId;
  const userId = req.userId;
  // Check if the like already exists
  db.query(
    "SELECT * FROM likes WHERE user_id = ? AND review_id = ?",
    [userId, reviewId],
    (err, result) => {
      if (err) {
        res.status(500).send({ error: err });
      } else {
        let likeExists = result.length > 0;
        if (likeExists) {
          // Like exists, remove it
          db.query(
            "DELETE FROM likes WHERE user_id = ? AND review_id = ?",
            [userId, reviewId],
            (err, result) => {
              if (err) {
                res.status(500).send({ error: err });
              } else {
                res.send({ message: "Like removed", userLiked: false });
              }
            }
          );
        } else {
          // Like doesn't exist, add it
          db.query(
            "INSERT INTO likes (user_id, review_id) VALUES (?, ?)",
            [userId, reviewId],
            (err, result) => {
              if (err) {
                res.status(500).send({ error: err });
              } else {
                res.send({ message: "Like added", userLiked: true });
              }
            }
          );
        }
      }
    }
  );
});

app.post('/send-friend-request', verifyJWT, (req, res) => {
  const { senderId, receiverId } = req.body;
  db.query(
    'INSERT INTO friends (user1_id, user2_id, status) VALUES (?, ?, "pending")',
    [senderId, receiverId],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error occurred ");
      } else {
        res.json(result);
      }
    }
  );
});

app.delete('/delete-friend/:userId/:friendId', verifyJWT, (req, res) => {
  const { userId, friendId } = req.params;
  db.query( 
    'DELETE FROM friends WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)',
    [userId, friendId, friendId, userId],
    (err, result) => {
      if (err) {
        console.error('Error deleting friend:', err);
        res.status(500).send('Error occurred while deleting friend.');
      } else {
        res.sendStatus(200);
      }
    }
  );
});

app.get('/friends/:userId', verifyJWT, (req, res) => {
  const { userId } = req.params;
  db.query(
    'SELECT * FROM users WHERE id IN (SELECT user1_id FROM friends WHERE user2_id = ? AND status = "accepted" UNION SELECT user2_id FROM friends WHERE user1_id = ? AND status = "accepted")',
    [userId, userId],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error occurred ");
      } else {
        res.json(result);
      }
    }
  );
});

app.get('/friend-requests/:userId', verifyJWT, (req, res) => {
  const { userId } = req.params;
  db.query(
    'SELECT * FROM users WHERE id IN (SELECT user1_id FROM friends WHERE user2_id = ? AND status = "pending")',
    [userId],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error occurred while retrieving average rating");
      } else {
        res.json(result);
      }
    }
  );
});

app.put('/friend-requests/accept', verifyJWT, (req, res) => {
  const { userId, friendId } = req.body;
  db.query(
    'UPDATE friends SET status = "accepted" WHERE user1_id = ? AND user2_id = ?',
    [friendId, userId],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error occurred");
      } else {
        res.json({ result });
      }
    }
  );
});

app.put('/friend-requests/decline', verifyJWT, (req, res) => {
  const { userId, friendId } = req.body;
  db.query(
    'DELETE FROM friends WHERE user1_id = ? AND user2_id = ?',
    [friendId, userId],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error occurred while deleting");
      } else {
        res.json({ result });
      }
    }
  );
});

app.get("/movies", (req, res) => {
  db.query(
    "SELECT * FROM movies",
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error occurred while retrieving movies");
      } else {
        res.json(result);
      }
    }
  );
});

app.get("/friend-reviews/:userId", verifyJWT, (req, res) => {
  const { userId } = req.params;
  db.query(
    `SELECT r.id, r.movie_id, r.user_id, r.review, u.username
    FROM reviews r
    INNER JOIN users u ON r.user_id = u.id
    WHERE r.user_id IN (
      SELECT user1_id FROM friends WHERE user2_id = ? AND status = "accepted"
      UNION
      SELECT user2_id FROM friends WHERE user1_id = ? AND status = "accepted"
    )`,
    [userId, userId],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error occurred while retrieving friend reviews");
      } else {
        res.json(result);
      }
    }
  );
});


app.get("/user-movie-status/:userId", verifyJWT, (req, res) => {
  const { userId } = req.params;
  db.query(
    `SELECT users.username, movies.id_movies, movies.status, movies.id_user
    FROM movies 
    INNER JOIN users ON movies.id_user = users.id
    WHERE movies.id_user IN (
      SELECT user1_id FROM friends WHERE user2_id = ? AND status = "accepted"
      UNION
      SELECT user2_id FROM friends WHERE user1_id = ? AND status = "accepted"
    )`,
    [userId, userId],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Server Error");
      } else {
        res.json(result);
      }
    }
  );
});

app.get("/user-movie-favourite/:userId", verifyJWT, (req, res) => {
  const { userId } = req.params;
  db.query(
    `SELECT users.username, movies.id_movies, movies.favourite, movies.id_user
    FROM movies 
    INNER JOIN users ON movies.id_user = users.id
    WHERE movies.favourite = 1 AND movies.id_user IN (
      SELECT user1_id FROM friends WHERE user2_id = ? AND status = "accepted"
      UNION
      SELECT user2_id FROM friends WHERE user1_id = ? AND status = "accepted"
    )`,
    [userId, userId],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Server Error");
      } else {
        res.json(result);
      }
    }
  );
});
