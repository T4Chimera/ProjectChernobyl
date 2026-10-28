// Generated from actual Luau configurations by tools/export-web-canon.py.
export default {
  "Bosses": {
    "Felon": {
      "Classification": "Miniboss",
      "MaxHealth": 1500,
      "Name": "Felon",
      "NameTag": "____-FELON",
      "NameTagColor": [
        1,
        0,
        0
      ],
      "RespawnsInSession": false
    },
    "Jayden": {
      "Classification": "Megaboss",
      "MaxHealth": 8000,
      "Name": "Jayden",
      "NameTag": "CI_JAYDEN",
      "NameTagColor": [
        1,
        0,
        0
      ],
      "RespawnsInSession": false
    },
    "John": {
      "Classification": "Miniboss",
      "MaxHealth": 2000,
      "Name": "John",
      "NameTag": "CI_JOHN",
      "NameTagColor": [
        1,
        0,
        0
      ],
      "RespawnsInSession": false
    },
    "Katya": {
      "Classification": "Megaboss",
      "MaxHealth": 12000,
      "Name": "Katya",
      "NameTag": "###_:(KATYA--",
      "NameTagColor": [
        1,
        0,
        0
      ],
      "RespawnsInSession": false
    },
    "Mikoyan": {
      "Classification": "Miniboss",
      "MaxHealth": 1500,
      "Name": "Mikoyan",
      "NameTag": "MIKOYAN___",
      "NameTagColor": [
        1,
        0,
        0
      ],
      "RespawnsInSession": false
    },
    "Nikolai": {
      "Classification": "Miniboss",
      "MaxHealth": 1000,
      "Name": "Nikolai",
      "NameTag": "___NIKOLAI##",
      "NameTagColor": [
        1,
        0,
        0
      ],
      "RespawnsInSession": false
    },
    "Novak": {
      "Classification": "Miniboss",
      "MaxHealth": 1000,
      "Name": "Novak",
      "NameTag": "##NOVAK___",
      "NameTagColor": [
        1,
        0,
        0
      ],
      "RespawnsInSession": false
    },
    "Sukhoi": {
      "Classification": "Megaboss",
      "MaxHealth": 5000,
      "Name": "Sukhoi",
      "NameTag": "____-#SUKHOI#",
      "NameTagColor": [
        1,
        0,
        0
      ],
      "RespawnsInSession": false
    }
  },
  "Enemies": {
    "Bosses": {
      "Felon": {
        "AttackSeconds": 0.65,
        "Damage": 8,
        "DetectionRange": 78,
        "MeleeDamage": 18,
        "MeleeRange": 5,
        "Range": 90,
        "Ranged": true,
        "WalkSpeed": 13,
        "WeaponName": "HK416"
      },
      "Jayden": {
        "AttackSeconds": 0.9,
        "Damage": 10,
        "DetectionRange": 72,
        "MeleeDamage": 25,
        "MeleeRange": 5,
        "Partner": "John",
        "Range": 80,
        "Ranged": true,
        "WalkSpeed": 13,
        "WeaponName": "Prototype firearm"
      },
      "John": {
        "AttackSeconds": 1.5,
        "Damage": 23,
        "DetectionRange": 64,
        "MeleeRange": 5,
        "Partner": "Jayden",
        "WalkSpeed": 12
      },
      "Katya": {
        "AttackSeconds": 1.8,
        "Damage": 27,
        "DetectionRange": 68,
        "HasPuddle": true,
        "HomeTether": 500,
        "MeleeRange": 6,
        "WalkSpeed": 12
      },
      "Mikoyan": {
        "AttackSeconds": 1.5,
        "Damage": 22,
        "DetectionRange": 38,
        "MeleeRange": 5,
        "PeacefulUntilShotInRoom": true,
        "WalkSpeed": 10
      },
      "Nikolai": {
        "AttackSeconds": 1.5,
        "Damage": 18,
        "DetectionRange": 52,
        "MeleeRange": 6,
        "Partner": "Novak",
        "WalkSpeed": 11,
        "WeaponName": "Axe"
      },
      "Novak": {
        "AttackSeconds": 1.1,
        "Damage": 24,
        "DetectionRange": 58,
        "MeleeRange": 6,
        "Partner": "Nikolai",
        "WalkSpeed": 17,
        "WeaponName": "Katana"
      },
      "Sukhoi": {
        "AttackSeconds": 1.6,
        "Damage": 25,
        "DetectionRange": 62,
        "MeleeRange": 6,
        "WalkSpeed": 14,
        "WeaponName": "Axe"
      }
    },
    "CorpseSeconds": 5,
    "GunHearingDistance": 85,
    "HearingDistance": 18,
    "HomeTether": 145,
    "Infected": {
      "AttackSeconds": 1.4,
      "Damage": 12,
      "DetectionRange": 48,
      "MaxHealth": 90,
      "MeleeRange": 5,
      "RespawnSeconds": 24,
      "WalkSpeed": 10
    },
    "KatyaPuddle": {
      "Cooldown": 13,
      "Damage": 6,
      "Lifetime": 7,
      "Radius": 6,
      "TickSeconds": 0.8,
      "WarningSeconds": 1.2
    },
    "KatyaSukhoiResponse": "Flee",
    "MaxConcurrentPaths": 2,
    "PathInterval": 2.2,
    "RelationshipRange": 45,
    "SearchSeconds": 8,
    "SprintHearingDistance": 30,
    "TargetMemorySeconds": 5,
    "UpdateSeconds": 0.2
  },
  "Executions": {
    "Bosses": {
      "Felon": [
        {
          "Beats": [
            {
              "At": 0,
              "Pose": "Windup",
              "VictimPose": "Guard"
            },
            {
              "At": 0.45,
              "Effect": "Blood",
              "Pose": "Strike",
              "VictimPose": "Stagger"
            },
            {
              "At": 1,
              "Pose": "Kick",
              "VictimPose": "Down"
            },
            {
              "At": 1.65,
              "Effect": "Shot",
              "Pose": "Fire",
              "VictimPose": "Down"
            }
          ],
          "Duration": 2.6,
          "Id": "Felon_KickAndShot"
        },
        {
          "Beats": [
            {
              "At": 0,
              "Pose": "Guard",
              "VictimPose": "Guard"
            },
            {
              "At": 0.4,
              "Effect": "Blood",
              "Pose": "Strike",
              "VictimPose": "Stagger"
            },
            {
              "At": 1.1,
              "Effect": "Shot",
              "Pose": "Burst",
              "VictimPose": "Stagger"
            },
            {
              "At": 1.35,
              "Effect": "Shot",
              "Pose": "Fire",
              "VictimPose": "Stagger"
            },
            {
              "At": 1.6,
              "Effect": "Shot",
              "Pose": "Burst",
              "VictimPose": "Down"
            }
          ],
          "Duration": 2.8,
          "Id": "Felon_RifleAndBurst"
        }
      ],
      "Jayden": [
        {
          "Beats": [
            {
              "At": 0,
              "Effect": "Shot",
              "Pose": "Fire",
              "VictimPose": "Stagger"
            },
            {
              "At": 0.65,
              "Pose": "Strike",
              "VictimPose": "Down"
            },
            {
              "At": 1.45,
              "Effect": "Shot",
              "Pose": "Fire",
              "VictimPose": "Down"
            }
          ],
          "Duration": 2.5,
          "Id": "Jayden_ShotAndKnockdown"
        },
        {
          "Beats": [
            {
              "At": 0,
              "Pose": "Windup",
              "VictimPose": "Guard"
            },
            {
              "At": 0.5,
              "Effect": "Blood",
              "Pose": "Strike",
              "VictimPose": "Stagger"
            },
            {
              "At": 1.2,
              "Effect": "Shot",
              "Pose": "Fire",
              "VictimPose": "Stagger"
            },
            {
              "At": 1.55,
              "Effect": "Shot",
              "Pose": "Burst",
              "VictimPose": "Down"
            }
          ],
          "Duration": 2.7,
          "Id": "Jayden_StrikeAndDoubleShot"
        }
      ],
      "John": [
        {
          "Beats": [
            {
              "At": 0,
              "Pose": "Windup",
              "VictimPose": "Guard"
            },
            {
              "At": 0.65,
              "Effect": "Blood",
              "Pose": "Strike",
              "VictimPose": "Down"
            },
            {
              "At": 1.2,
              "Pose": "Guard",
              "VictimPose": "Down"
            }
          ],
          "Duration": 1.9,
          "Id": "John_HeavyStrike"
        },
        {
          "Beats": [
            {
              "At": 0,
              "Pose": "Windup",
              "VictimPose": "Guard"
            },
            {
              "At": 0.45,
              "Effect": "Blood",
              "Pose": "Strike",
              "VictimPose": "Stagger"
            },
            {
              "At": 1,
              "Pose": "Grab",
              "VictimPose": "Stagger"
            },
            {
              "At": 1.6,
              "Pose": "Throw",
              "VictimPose": "Down"
            }
          ],
          "Duration": 2.8,
          "Id": "John_StrikeAndThrow"
        }
      ],
      "Katya": [
        {
          "Beats": [
            {
              "At": 0,
              "Pose": "Grab",
              "VictimPose": "Guard"
            },
            {
              "At": 0.7,
              "Pose": "Lift",
              "VictimPose": "Stagger"
            },
            {
              "At": 1.4,
              "Effect": "Blood",
              "Pose": "Throw",
              "VictimPose": "Down"
            }
          ],
          "Duration": 2.7,
          "Id": "Katya_GrabAndCollapse"
        },
        {
          "Beats": [
            {
              "At": 0,
              "Pose": "Strike",
              "VictimPose": "Down"
            },
            {
              "At": 0.55,
              "Pose": "Grab",
              "VictimPose": "Down"
            },
            {
              "At": 1.1,
              "Effect": "Blood",
              "Pose": "Slam",
              "VictimPose": "Down"
            },
            {
              "At": 2.2,
              "Pose": "Grab",
              "VictimPose": "Down"
            },
            {
              "At": 2.8,
              "Pose": "Kick",
              "VictimPose": "Down"
            }
          ],
          "Duration": 3.5,
          "Id": "Katya_PinAndKick"
        },
        {
          "Beats": [
            {
              "At": 0,
              "Pose": "Grab",
              "VictimPose": "Guard"
            },
            {
              "At": 0.65,
              "Pose": "Guard",
              "VictimPose": "Stagger"
            },
            {
              "At": 1.25,
              "Pose": "Throw",
              "VictimPose": "Down"
            },
            {
              "At": 1.8,
              "Pose": "Idle",
              "VictimPose": "Down"
            }
          ],
          "Duration": 2.5,
          "Id": "Katya_RestraintAndCollapse"
        },
        {
          "Beats": [
            {
              "At": 0,
              "Pose": "Windup",
              "VictimPose": "Guard"
            },
            {
              "At": 0.55,
              "Effect": "Blood",
              "Pose": "Strike",
              "VictimPose": "Stagger"
            },
            {
              "At": 1.2,
              "Pose": "Kick",
              "VictimPose": "Down"
            },
            {
              "At": 1.85,
              "Pose": "Guard",
              "VictimPose": "Down"
            }
          ],
          "Duration": 2.6,
          "Id": "Katya_StrikeAndKick"
        }
      ],
      "Mikoyan": [
        {
          "Beats": [
            {
              "At": 0,
              "Pose": "Windup",
              "VictimPose": "Guard"
            },
            {
              "At": 0.45,
              "Effect": "Blood",
              "Pose": "Strike",
              "VictimPose": "Stagger"
            },
            {
              "At": 0.95,
              "Pose": "Windup",
              "VictimPose": "Stagger"
            },
            {
              "At": 1.35,
              "Pose": "Strike",
              "VictimPose": "Down"
            }
          ],
          "Duration": 2.1,
          "Id": "Mikoyan_TwoStrikes"
        },
        {
          "Beats": [
            {
              "At": 0,
              "Pose": "Grab",
              "VictimPose": "Guard"
            },
            {
              "At": 0.7,
              "Pose": "Lift",
              "VictimPose": "Stagger"
            },
            {
              "At": 1.25,
              "Effect": "Blood",
              "Pose": "Slam",
              "VictimPose": "Down"
            },
            {
              "At": 1.85,
              "Pose": "Guard",
              "VictimPose": "Down"
            }
          ],
          "Duration": 2.6,
          "Id": "Mikoyan_GrabAndCollapse"
        },
        {
          "Beats": [
            {
              "At": 0,
              "Pose": "Guard",
              "VictimPose": "Guard"
            },
            {
              "At": 0.4,
              "Pose": "Kick",
              "VictimPose": "Down"
            },
            {
              "At": 1,
              "Pose": "Windup",
              "VictimPose": "Down"
            },
            {
              "At": 1.5,
              "Effect": "Blood",
              "Pose": "Strike",
              "VictimPose": "Down"
            }
          ],
          "Duration": 2.4,
          "Id": "Mikoyan_KickAndStrike"
        }
      ],
      "Nikolai": [
        {
          "Beats": [
            {
              "At": 0,
              "Pose": "Windup",
              "VictimPose": "Guard"
            },
            {
              "At": 0.6,
              "Effect": "Blood",
              "Pose": "Strike",
              "VictimPose": "Stagger"
            },
            {
              "At": 1.15,
              "Pose": "Windup",
              "VictimPose": "Stagger"
            },
            {
              "At": 1.7,
              "Pose": "Strike",
              "VictimPose": "Down"
            }
          ],
          "Duration": 2.5,
          "Id": "Nikolai_AxeCombination"
        },
        {
          "Beats": [
            {
              "At": 0,
              "Pose": "Guard",
              "VictimPose": "Guard"
            },
            {
              "At": 0.5,
              "Pose": "Kick",
              "VictimPose": "Down"
            },
            {
              "At": 1.2,
              "Pose": "Windup",
              "VictimPose": "Down"
            },
            {
              "At": 1.85,
              "Effect": "Blood",
              "Pose": "Strike",
              "VictimPose": "Down"
            }
          ],
          "Duration": 2.7,
          "Id": "Nikolai_KickAndAxe"
        }
      ],
      "Novak": [
        {
          "Beats": [
            {
              "At": 0,
              "Pose": "Guard",
              "VictimPose": "Guard"
            },
            {
              "At": 0.35,
              "Effect": "Blood",
              "Pose": "Strike",
              "VictimPose": "Stagger"
            },
            {
              "At": 0.8,
              "Pose": "Windup",
              "VictimPose": "Stagger"
            },
            {
              "At": 1.15,
              "Pose": "Strike",
              "VictimPose": "Down"
            }
          ],
          "Duration": 1.9,
          "Id": "Novak_BladeAndStrike"
        },
        {
          "Beats": [
            {
              "At": 0,
              "Pose": "Windup",
              "VictimPose": "Guard"
            },
            {
              "At": 0.25,
              "Effect": "Blood",
              "Pose": "Strike",
              "VictimPose": "Stagger"
            },
            {
              "At": 0.45,
              "Pose": "Throw",
              "VictimPose": "Stagger"
            },
            {
              "At": 0.65,
              "Pose": "Strike",
              "VictimPose": "Stagger"
            },
            {
              "At": 0.85,
              "Pose": "Throw",
              "VictimPose": "Stagger"
            },
            {
              "At": 1.05,
              "Pose": "Strike",
              "VictimPose": "Down"
            }
          ],
          "Duration": 2,
          "Id": "Novak_RapidBladeFlurry"
        }
      ],
      "Sukhoi": [
        {
          "Beats": [
            {
              "At": 0,
              "Pose": "Windup",
              "VictimPose": "Guard"
            },
            {
              "At": 0.55,
              "Effect": "Blood",
              "Pose": "Grab",
              "VictimPose": "Stagger"
            },
            {
              "At": 1,
              "Pose": "Slam",
              "VictimPose": "Down"
            },
            {
              "At": 1.4,
              "Pose": "Grab",
              "VictimPose": "Down"
            },
            {
              "At": 2.9,
              "Pose": "Kick",
              "VictimPose": "Down"
            }
          ],
          "Duration": 3.6,
          "Id": "Sukhoi_AppendageAndSlam"
        },
        {
          "Beats": [
            {
              "At": 0,
              "Pose": "Grab",
              "VictimPose": "Stagger"
            },
            {
              "At": 0.5,
              "Pose": "Lift",
              "VictimPose": "Stagger"
            },
            {
              "At": 1,
              "Pose": "Slam",
              "VictimPose": "Down"
            },
            {
              "At": 1.5,
              "Effect": "Blood",
              "Pose": "Strike",
              "VictimPose": "Down"
            },
            {
              "At": 1.85,
              "Pose": "Windup",
              "VictimPose": "Down"
            },
            {
              "At": 2,
              "Pose": "Strike",
              "VictimPose": "Down"
            },
            {
              "At": 2.25,
              "Pose": "Windup",
              "VictimPose": "Down"
            },
            {
              "At": 2.4,
              "Pose": "Strike",
              "VictimPose": "Down"
            },
            {
              "At": 2.65,
              "Pose": "Windup",
              "VictimPose": "Down"
            },
            {
              "At": 2.8,
              "Pose": "Strike",
              "VictimPose": "Down"
            }
          ],
          "Duration": 3.7,
          "Id": "Sukhoi_LiftAndStrikes"
        },
        {
          "Beats": [
            {
              "At": 0,
              "Pose": "Windup",
              "VictimPose": "Guard"
            },
            {
              "At": 0.45,
              "Effect": "Blood",
              "Pose": "Strike",
              "VictimPose": "Down"
            },
            {
              "At": 0.9,
              "Pose": "Grab",
              "VictimPose": "Down"
            },
            {
              "At": 2.55,
              "Pose": "Windup",
              "VictimPose": "Down"
            },
            {
              "At": 2.85,
              "Pose": "Strike",
              "VictimPose": "Down"
            }
          ],
          "Duration": 3.5,
          "Id": "Sukhoi_KnockdownAndPin"
        }
      ]
    },
    "MaxVictimHealth": 25,
    "Range": 7
  },
  "Game": {
    "Camera": {
      "FieldOfView": 75
    },
    "DevelopmentName": "Project Chernobyl",
    "Enemies": {
      "OrdinaryInfectedRespawn": true,
      "UniqueBossesRespawnInSession": false
    },
    "InstanceWaitSeconds": 10,
    "Milestone": "Six-sector gameplay prototype",
    "Phase": 2,
    "Player": {
      "JumpPower": 50,
      "MaxHealth": 100,
      "RespawnTime": 5,
      "WalkSpeed": 16
    },
    "TaskForces": [
      "Nu-7",
      "Epsilon-11",
      "Beta-7",
      "Zeta-9"
    ]
  },
  "Map": {
    "BossSpawns": {
      "Felon": {
        "position": [
          -250,
          4,
          -45
        ]
      },
      "Jayden": {
        "position": [
          -25,
          4,
          255
        ]
      },
      "John": {
        "position": [
          195,
          4,
          35
        ]
      },
      "Katya": {
        "position": [
          195,
          4,
          255
        ]
      },
      "Mikoyan": {
        "position": [
          -158,
          4,
          44
        ]
      },
      "Nikolai": {
        "position": [
          -40,
          4,
          35
        ]
      },
      "Novak": {
        "position": [
          55,
          4,
          -50
        ]
      },
      "Sukhoi": {
        "position": [
          -250,
          4,
          265
        ]
      }
    },
    "Checkpoint": {
      "position": [
        -365,
        4,
        0
      ]
    },
    "InfectedSpawns": [
      {
        "position": [
          -268,
          4,
          25
        ]
      },
      {
        "position": [
          -175,
          4,
          -42
        ]
      },
      {
        "position": [
          35,
          4,
          38
        ]
      },
      {
        "position": [
          -55,
          4,
          -48
        ]
      },
      {
        "position": [
          250,
          4,
          25
        ]
      },
      {
        "position": [
          170,
          4,
          -45
        ]
      },
      {
        "position": [
          -195,
          4,
          240
        ]
      },
      {
        "position": [
          -270,
          4,
          170
        ]
      },
      {
        "position": [
          25,
          4,
          240
        ]
      },
      {
        "position": [
          -48,
          4,
          170
        ]
      },
      {
        "position": [
          245,
          4,
          240
        ]
      },
      {
        "position": [
          170,
          4,
          170
        ]
      }
    ],
    "MikoyanRoom": {
      "Center": [
        -158,
        10,
        40
      ],
      "Size": [
        44,
        20,
        52
      ]
    },
    "Name": "ChernobylMap",
    "SectorSize": [
      180,
      24,
      160
    ],
    "Sectors": [
      {
        "Accent": [
          0.3568627450980392,
          0.49411764705882355,
          0.4549019607843137
        ],
        "Center": [
          -220,
          0,
          0
        ],
        "Id": 1,
        "Name": "REACTOR 1 / INTAKE",
        "Reactor": 1,
        "Status": "OFFLINE"
      },
      {
        "Accent": [
          0.5450980392156862,
          0.4823529411764706,
          0.29411764705882354
        ],
        "Center": [
          0,
          0,
          0
        ],
        "Id": 2,
        "Name": "REACTOR 2 / TURBINE HALL",
        "Reactor": 2,
        "Status": "OFFLINE"
      },
      {
        "Accent": [
          0.3568627450980392,
          0.44313725490196076,
          0.5686274509803921
        ],
        "Center": [
          220,
          0,
          0
        ],
        "Id": 3,
        "Name": "REACTOR 3 / CONTROL",
        "Reactor": 3,
        "Status": "OFFLINE"
      },
      {
        "Accent": [
          0.5882352941176471,
          0.29411764705882354,
          0.24313725490196078
        ],
        "Center": [
          -220,
          0,
          220
        ],
        "Id": 4,
        "Name": "REACTOR 4 / INCIDENT ZONE",
        "Reactor": 4,
        "Status": "DESTROYED"
      },
      {
        "Accent": [
          0.592156862745098,
          0.43529411764705883,
          0.2235294117647059
        ],
        "Center": [
          0,
          0,
          220
        ],
        "Id": 5,
        "Name": "REACTOR 5 / CONSTRUCTION",
        "Reactor": 5,
        "Status": "UNFINISHED"
      },
      {
        "Accent": [
          0.47058823529411764,
          0.396078431372549,
          0.5686274509803921
        ],
        "Center": [
          220,
          0,
          220
        ],
        "Id": 6,
        "Name": "REACTOR 6 / CONSTRUCTION",
        "Reactor": 6,
        "Status": "UNFINISHED"
      }
    ]
  },
  "Voices": {
    "AllowProposed": false,
    "CategoryCooldowns": {
      "Damaged": 8,
      "Execution": 3,
      "LostTarget": 12,
      "MeleeHit": 8,
      "Nearby": 18,
      "PlayerDetected": 9
    },
    "DefaultCooldown": 5,
    "MaxDistance": 100,
    "MinDistance": 8,
    "Voices": {
      "Felon": {
        "Distortion": 0.45,
        "Lines": {
          "Damaged": [
            {
              "Duration": 2,
              "SoundId": "",
              "Text": "IM HIT!!"
            },
            {
              "Duration": 2,
              "SoundId": "",
              "Text": "NOT ENOUGH!!!"
            }
          ],
          "Execution": [
            {
              "Duration": 3.5,
              "SoundId": "",
              "Text": "GOOD LUCK NEXT TIME KID!!"
            },
            {
              "Duration": 4.5,
              "SoundId": "",
              "Text": "YOU SHOULD NOT TRUST THEM! YOUR FAULT!"
            }
          ],
          "MeleeHit": [
            {
              "Duration": 3.5,
              "SoundId": "",
              "Text": "BAHAHA WEAKLING!!!"
            },
            {
              "Duration": 3.5,
              "SoundId": "",
              "Text": "THATS ALL YOU GOT???!"
            }
          ],
          "Nearby": [
            {
              "Duration": 3.5,
              "SoundId": "",
              "Text": "Footsteps? WHO IS THERE!!!!"
            },
            {
              "Duration": 4,
              "SoundId": "",
              "Text": "If anyone is here step out you cowards!!"
            }
          ],
          "PlayerDetected": [
            {
              "Duration": 2,
              "SoundId": "",
              "Text": "ENEMY!!!"
            },
            {
              "Duration": 3.5,
              "SoundId": "",
              "Text": "LAY DOWN!!!! I SAID LAY DOWN!"
            }
          ]
        },
        "Radio": true,
        "Volume": 0.9
      },
      "Jayden": {
        "Distortion": 0.55,
        "Lines": {
          "Damaged": [
            {
              "Duration": 3.5,
              "SoundId": "",
              "Text": "IS THAT SUPPOSED TO STOP ME?!"
            },
            {
              "Duration": 2.5,
              "SoundId": "",
              "Text": "YOU'RE TOO LATE!"
            },
            {
              "Duration": 2.5,
              "SoundId": "",
              "Text": "I'M NOT FINISHED!"
            }
          ],
          "Execution": [
            {
              "Duration": 3.5,
              "SoundId": "",
              "Text": "You should've stayed outside."
            },
            {
              "Duration": 3.5,
              "SoundId": "",
              "Text": "The reactor was never the problem."
            },
            {
              "Duration": 3.5,
              "SoundId": "",
              "Text": "They sent you here to disappear."
            }
          ],
          "LostTarget": [
            {
              "Duration": 2.5,
              "SoundId": "",
              "Text": "COME BACK HERE!"
            },
            {
              "Duration": 3.5,
              "SoundId": "",
              "Text": "YOU CAN'T HIDE FOREVER!"
            },
            {
              "Duration": 3.5,
              "SoundId": "",
              "Text": "I CAN STILL HEAR YOU!"
            }
          ],
          "Nearby": [
            {
              "Duration": 3.5,
              "SoundId": "",
              "Text": "John...? Status report."
            },
            {
              "Duration": 3.5,
              "SoundId": "",
              "Text": "Something's wrong with this place..."
            },
            {
              "Duration": 3.5,
              "SoundId": "",
              "Text": "I KNOW YOU'RE THERE."
            }
          ],
          "PlayerDetected": [
            {
              "Duration": 2.5,
              "SoundId": "",
              "Text": "NO WITNESSES!"
            },
            {
              "Duration": 3.5,
              "SoundId": "",
              "Text": "THE FOUNDATION SENT MORE?!"
            },
            {
              "Duration": 4.5,
              "SoundId": "",
              "Text": "YOU HAVE NO IDEA WHAT YOU'VE WALKED INTO!"
            }
          ]
        },
        "Proposed": true,
        "Radio": true,
        "Volume": 0.9
      },
      "John": {
        "Distortion": 0.3,
        "Lines": {
          "Damaged": [
            {
              "Duration": 2.5,
              "SoundId": "",
              "Text": "That was a mistake."
            },
            {
              "Duration": 2,
              "SoundId": "",
              "Text": "STILL STANDING!"
            },
            {
              "Duration": 2.5,
              "SoundId": "",
              "Text": "I've survived worse!"
            }
          ],
          "Execution": [
            {
              "Duration": 3.5,
              "SoundId": "",
              "Text": "Your Foundation lied to you."
            },
            {
              "Duration": 4,
              "SoundId": "",
              "Text": "You never knew what happened here."
            },
            {
              "Duration": 3.5,
              "SoundId": "",
              "Text": "Mission failed, soldier."
            }
          ],
          "LostTarget": [
            {
              "Duration": 3.5,
              "SoundId": "",
              "Text": "Running away? Typical Foundation."
            },
            {
              "Duration": 4,
              "SoundId": "",
              "Text": "Come out. We have unfinished business."
            },
            {
              "Duration": 2.5,
              "SoundId": "",
              "Text": "Where did you go?!"
            }
          ],
          "Nearby": [
            {
              "Duration": 4,
              "SoundId": "",
              "Text": "Foundation personnel... I can hear you."
            },
            {
              "Duration": 3.5,
              "SoundId": "",
              "Text": "You shouldn't have come back."
            },
            {
              "Duration": 4.5,
              "SoundId": "",
              "Text": "Jayden? Respond. Where the hell are you?"
            }
          ],
          "PlayerDetected": [
            {
              "Duration": 2,
              "SoundId": "",
              "Text": "FOUNDATION!"
            },
            {
              "Duration": 3.5,
              "SoundId": "",
              "Text": "Oh, look who finally showed up."
            },
            {
              "Duration": 2.5,
              "SoundId": "",
              "Text": "YOU'RE NOT LEAVING!"
            }
          ]
        },
        "Proposed": true,
        "Radio": true,
        "Volume": 0.75
      },
      "Katya": {
        "Distortion": 0.2,
        "Lines": {
          "Damaged": [
            {
              "Duration": 3.5,
              "SoundId": "",
              "Text": "YOU THINK THAT DID ANYTHING?????????"
            },
            {
              "Duration": 4.5,
              "SoundId": "",
              "Text": "I WILL NOT ALLOW YOU TO HIT ME ANYMORE!!!!!!"
            },
            {
              "Duration": 2.5,
              "SoundId": "",
              "Text": "I'LL KILL YOU!!!"
            }
          ],
          "Execution": [
            {
              "Duration": 3.5,
              "SoundId": "",
              "Text": "THIS IS HOW IT FEELS LIKE!!!!!"
            },
            {
              "Duration": 3.5,
              "SoundId": "",
              "Text": "I GOT YOU!!!!!!!!!! I HATE YOU!!!!"
            },
            {
              "Duration": 4.5,
              "SoundId": "",
              "Text": "I HATE YOU, I HATE YOU, DIEEEEEEEE!!!!!!!!!"
            }
          ],
          "LostTarget": [
            {
              "Duration": 3.5,
              "SoundId": "",
              "Text": "COWARD WHERE ARE YOU!"
            },
            {
              "Cue": true,
              "Duration": 4,
              "SoundId": "",
              "Text": "[Intense crying]"
            },
            {
              "Duration": 2.5,
              "SoundId": "",
              "Text": "COME BACK!!!"
            },
            {
              "Duration": 3.5,
              "SoundId": "",
              "Text": "SUKHOI DONT HIDE AGAIN!!!!"
            }
          ],
          "Nearby": [
            {
              "Cue": true,
              "Duration": 4,
              "SoundId": "",
              "Text": "[Crying]"
            },
            {
              "Duration": 4.5,
              "SoundId": "",
              "Text": "How could you.... how could you.."
            }
          ],
          "PlayerDetected": [
            {
              "Duration": 4,
              "SoundId": "",
              "Text": "THERE YOU ARE!!!!!!!!!!!! COWARD!!!!!!!!!!"
            },
            {
              "Duration": 3.5,
              "SoundId": "",
              "Text": "HOW DARE YOU??!!!!!!!!! GET BACK!!!"
            },
            {
              "Duration": 2.5,
              "SoundId": "",
              "Text": "I'LL KILL YOU!!!!!!!!"
            }
          ]
        },
        "Radio": false,
        "Volume": 0.8
      },
      "Mikoyan": {
        "Distortion": 0.7,
        "Lines": {
          "Execution": [
            {
              "Duration": 3.5,
              "SoundId": "",
              "Text": "Leave me ALONE."
            }
          ]
        },
        "Radio": true,
        "Volume": 0.55
      },
      "Nikolai": {
        "Distortion": 0.2,
        "Lines": {
          "Execution": [
            {
              "Duration": 2.5,
              "SoundId": "",
              "Text": "Sorry not sorry"
            }
          ],
          "Nearby": [
            {
              "Duration": 4.5,
              "SoundId": "",
              "Text": "Novak???? ARE YOU THERE???? NOVAK!!"
            }
          ]
        },
        "Radio": false,
        "Volume": 0.75
      },
      "Novak": {
        "Distortion": 0,
        "Lines": {},
        "Radio": false,
        "Volume": 0
      },
      "Sukhoi": {
        "Distortion": 0.6,
        "Lines": {
          "Damaged": [
            {
              "Duration": 3.5,
              "SoundId": "",
              "Text": "IM NOT DEAD YET!!!"
            },
            {
              "Duration": 3.5,
              "SoundId": "",
              "Text": "PFFTTT YOU'RE PATHETIC!!!!!!!!!!!!"
            }
          ],
          "Execution": {},
          "Nearby": [
            {
              "Duration": 3.5,
              "SoundId": "",
              "Text": "Gamma radiation warning"
            },
            {
              "Duration": 2.5,
              "SoundId": "",
              "Text": "WHOS THERE!!!"
            }
          ],
          "PlayerDetected": [
            {
              "Duration": 2.5,
              "SoundId": "",
              "Text": "COME HERE!!!"
            },
            {
              "Duration": 3.5,
              "SoundId": "",
              "Text": "HAHHAHAA YOU CANT RUN!!!!!"
            }
          ]
        },
        "Radio": true,
        "Volume": 1
      }
    }
  },
  "Weapon": {
    "AimFieldOfView": 55,
    "Damage": 40,
    "FireInterval": 0.12,
    "FlashlightAngle": 65,
    "FlashlightBrightness": 4,
    "FlashlightRange": 75,
    "Id": "PrototypeRifle",
    "MagazineSize": 30,
    "Range": 350,
    "ReloadSeconds": 2,
    "ReserveAmmo": 240,
    "SoundIds": {
      "Fire": "",
      "FootstepMetal": "",
      "Reload": ""
    }
  }
};
